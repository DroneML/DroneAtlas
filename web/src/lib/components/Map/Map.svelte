<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as MaplibreMap } from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { getStyleById } from './MapStyles';
	import { selectedMapStyle } from '$lib/stores/mapStyle.store';
	import {
		isLoading,
		loadingMessage,
		dataError,
		rasterLayers,
		updateAllRasterLayersOpacity
	} from './store';
	import { parseUrlFilters, serializeFiltersToUrl, debounce } from './utils/urlParams';
	import { isClickOnVisibleRaster } from './utils/rasterClickUtils';
	import { preloadData } from './utils/MapInitializer';
	import {
		getRasterValueAtCoordinate,
		getRasterValueAtCoordinateFast,
		findVisibleRasterLayerAtCoordinate,
		isLatitudeInWebMercatorRange
	} from './utils/rasterPixelQuery';
	import { WEB_MERCATOR_MAX_LATITUDE } from './utils/geoTiffProcessor';
	import { loadAndProcessGeoTIFF } from './utils/geoTiffProcessor';

	// Import modularized components
	import MapCore from './components/MapCore.svelte';
	import MapControls from './components/MapControls.svelte';
	import RasterLayerManager from './components/RasterLayerManager.svelte';
	import RasterLegend from './components/RasterLegend.svelte';
	import LocationsSidebar from './components/LocationsSidebar.svelte';
	import LocationAnalyticsPanel from './components/LocationAnalyticsPanel.svelte';
	import HeroDrone from '$lib/demo/components/HeroDrone.svelte';
	import {
		projectLocations,
		selectedLocation,
		selectLocation,
		toggleProjectLayer,
		updateProjectLayerOpacity
	} from '$lib/stores/projects.store';
	import { WEESP_IMAGE_BOUNDS, weespSiteUvToImageUv } from '$lib/demo/weesp';
	import { get } from 'svelte/store';
	import type { ProjectLocation, RasterLayer } from '$lib/types';

	// Props that can be passed to the component
	export let initialCenter: [number, number] = [-25, 16]; // Default center coordinates [lng, lat]
	export let initialZoom: number = 2; // Default zoom level
	export let initialStyleId: string | null = null; // Optional style ID to use

	type AnnotationCoordinate = [number, number];
	type AnnotationFeature = {
		type: 'Feature';
		properties: { id: string; active?: boolean };
		geometry: { type: 'LineString'; coordinates: AnnotationCoordinate[] };
	};

	// Track the global opacity value for raster layers
	let globalOpacity = 80; // Default to 80%

	// Map instance and state
	let map: MaplibreMap | null = null;
	let isStyleLoaded = false;

	// Debug overlay state
	let disableFloatingDrone = true;
	let navigationDroneVisible = false;
	let navigationDroneMode: 'idle' | 'transit' = 'idle';
	let navigationDroneTimer: ReturnType<typeof setTimeout> | null = null;
	let navigationFlightRun = 0;
	let siteModelVisible = true;
	let siteModelOpacity = 100;
	let weespAnalysisPopupVisible = false;
	let weespDemoTimers: ReturnType<typeof setTimeout>[] = [];
	const siteReconstructionSourceId = 'weesp-site-reconstruction';
	const siteReconstructionLayerIds = [
		'weesp-site-moat-glow',
		'weesp-site-moat-line',
		'weesp-site-buildings',
		'weesp-site-wall-outlines'
	];
	const weespLayerOpacity: Record<string, number> = {
		'weesp-lidar': 0.56,
		'weesp-multispectral': 0.38,
		'weesp-thermal': 0.42,
		'weesp-probability': 0.62
	};
	const weespRevealLayerIds = ['weesp-lidar', 'weesp-multispectral', 'weesp-thermal'];
	const siteReconstructionBaseOpacity: Record<string, number> = {
		'weesp-site-moat-glow': 0.42,
		'weesp-site-moat-line': 0.95,
		'weesp-site-buildings': 0.42,
		'weesp-site-wall-outlines': 1
	};
	let annotationDrawingEnabled = false;
	let annotationIsDrawing = false;
	let annotationFeatures: AnnotationFeature[] = [];
	let activeAnnotation: AnnotationCoordinate[] = [];
	const annotationsSourceId = 'annotation-drawings';
	const annotationsHaloLayerId = 'annotation-drawings-halo';
	const annotationsLayerId = 'annotation-drawings-line';

	// Simple cache for SE rasters to compute CIs without reloading each click
	const seRasterCache = new Map<
		string,
		{ bounds: number[]; rasterData: Float32Array; width: number; height: number }
	>();

	// References to child components
	let rasterLayerManager: RasterLayerManager;

	$: visibleLayerCount = Array.from($rasterLayers.values()).filter((layer) => layer.isVisible).length;

	// Popover state for raster clicks
	let showPopover = false;
	let popoverCoordinates: [number, number] | null = null;
	let popoverProperties: any = null;

	// Debug state
	let debugInfo = {
		lastClick: null as [number, number] | null,
		pixelCoords: null as { x: number; y: number } | null,
		rasterValue: null as number | null,
		error: null as string | null,
		rasterClicked: false,
		rasterName: null as string | null,
		// Hover state
		hoverCoords: null as [number, number] | null,
		hoverRasterValue: null as number | null,
		hoverRasterName: null as string | null,
		hoverInRaster: false,
		hoverMousePos: null as { x: number; y: number } | null
	};

	// Handle cursor change immediately (no debounce)
	function handleCursorChange(event: maplibregl.MapMouseEvent) {
		if (!map) return;
		if (annotationDrawingEnabled) {
			map.getCanvas().style.cursor = 'crosshair';
			return;
		}

		const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];
		const currentRasterLayers = $rasterLayers;

		// Check raster under cursor
		const visibleRasterLayer = findVisibleRasterLayerAtCoordinate(
			currentRasterLayers,
			coords[0],
			coords[1]
		);

		let pointer = false;
		if (visibleRasterLayer) {
			const v = getRasterValueAtCoordinateFast(visibleRasterLayer, coords[0], coords[1]);
			pointer = v !== null && isFinite(v as number);
		}

		map.getCanvas().style.cursor = pointer ? 'pointer' : '';
	}

	// Handle map hover for raster feedback - fast version for tooltip
	function handleMapHoverFast(event: maplibregl.MapMouseEvent) {
		if (!map) return;
		if (annotationDrawingEnabled) {
			debugInfo.hoverInRaster = false;
			debugInfo.hoverRasterValue = null;
			return;
		}

		const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];
		const currentRasterLayers = $rasterLayers;
		debugInfo.hoverMousePos = event.point;

		const visibleRasterLayer = findVisibleRasterLayerAtCoordinate(
			currentRasterLayers,
			coords[0],
			coords[1]
		);

		if (visibleRasterLayer) {
			const value = getRasterValueAtCoordinateFast(visibleRasterLayer, coords[0], coords[1]);
			debugInfo.hoverInRaster = true;
			debugInfo.hoverRasterValue = value;
			debugInfo.hoverRasterName = visibleRasterLayer.name;
		} else {
			debugInfo.hoverInRaster = false;
			debugInfo.hoverRasterValue = null;
			debugInfo.hoverRasterName = null;
		}
	}

	function isProbabilityLayerName(name: string | null): boolean {
		return Boolean(name?.toLowerCase().includes('probability'));
	}

	function formatHoverRasterValue(value: number, name: string | null): string {
		if (isProbabilityLayerName(name)) return `${Math.round(value)}%`;
		return String(value);
	}

	// Slower update for debug panel details
	function handleMapHoverDebug(event: maplibregl.MapMouseEvent) {
		if (!map) return;
		if (annotationDrawingEnabled) return;

		const coords: [number, number] = [event.lngLat.lng, event.lngLat.lat];
		const currentRasterLayers = $rasterLayers;
		debugInfo.hoverCoords = coords;

		const visibleRasterLayer = findVisibleRasterLayerAtCoordinate(
			currentRasterLayers,
			coords[0],
			coords[1]
		);

		if (visibleRasterLayer) {
			debugInfo.hoverRasterName = visibleRasterLayer.name;
		} else {
			debugInfo.hoverRasterName = null;
		}
	}

	// Very light debounce for tooltip (10ms)
	const debouncedHoverFast = debounce(handleMapHoverFast, 10);
	// Heavier debounce for debug panel (100ms)
	const debouncedHoverDebug = debounce(handleMapHoverDebug, 100);

	// Handle map ready event
	function handleMapReady(event: CustomEvent<{ map: MaplibreMap }>) {
		map = event.detail.map;
		isStyleLoaded = true;
		(window as any).__droneAtlasMap = map;
		map.jumpTo({ center: [5.5, 52.0], zoom: 7, bearing: 0, pitch: 0 });
		setTimeout(() => runWeespDemoSequence(), 450);

		// Add hover event listeners
		map.on('mousemove', handleCursorChange);
		map.on('mousemove', debouncedHoverFast);
		map.on('mousemove', debouncedHoverDebug);
		map.on('mousedown', handleAnnotationMouseDown);
		map.on('mousemove', handleAnnotationMouseMove);
		map.on('mouseup', handleAnnotationMouseUp);

		if (map && !map.getSource('country-boundaries')) {
			map.addSource('country-boundaries', {
				type: 'geojson',
				data: '/ne_110m_admin_0_boundary_lines_land.geojson'
			});

			map.addLayer({
				id: 'country-boundaries-layer',
				type: 'line',
				source: 'country-boundaries',
				layout: {
					visibility: 'none'
				},
				paint: {
					'line-color': '#80808090',
					'line-width': 2
				}
			});
		}
	}

	// Handle style change event
	function handleStyleChange() {
		isStyleLoaded = true;
		if (map) {
			map.once('idle', () => {
				serializeFiltersToUrl(map, globalOpacity);
			});
		}
	}

	// Handle map click event — raster clicks only
	async function handleMapClick(event: CustomEvent) {
		if (!map) return;
		if (annotationDrawingEnabled) {
			showPopover = false;
			isLoading.set(false);
			return;
		}

		showPopover = false;
		popoverCoordinates = null;
		popoverProperties = null;

		const allFeatures = map.queryRenderedFeatures([event.detail.point.x, event.detail.point.y]);
		const isWater = allFeatures.some((feature) => {
			const layerId = feature.layer.id.toLowerCase();
			const sourceLayer = feature.sourceLayer?.toLowerCase() || '';
			return (
				layerId.includes('water') ||
				layerId.includes('ocean') ||
				layerId.includes('sea') ||
				layerId.includes('lake') ||
				layerId.includes('river') ||
				sourceLayer.includes('water') ||
				sourceLayer.includes('ocean') ||
				sourceLayer.includes('sea') ||
				sourceLayer.includes('lake') ||
				sourceLayer.includes('river')
			);
		});

		if (isWater) {
			isLoading.set(false);
			return;
		}

		const clickCoordinates: [number, number] = [event.detail.lngLat.lng, event.detail.lngLat.lat];
		const currentRasterLayers = $rasterLayers;

		// Check if any raster layer is visible
		const hasVisibleRasterLayer = Array.from(currentRasterLayers.values()).some(
			(layer) => layer.isVisible
		);

		if (!hasVisibleRasterLayer) {
			isLoading.set(false);
			return;
		}

		// Debug: Log exact click coordinates and update debug info
		debugInfo.lastClick = clickCoordinates;
		debugInfo.pixelCoords = event.detail.point;
		debugInfo.error = null;
		debugInfo.rasterValue = null;
		debugInfo.rasterClicked = false;
		debugInfo.rasterName = null;

		// Find the visible raster layer at this coordinate
		const visibleRasterLayer = findVisibleRasterLayerAtCoordinate(
			currentRasterLayers,
			clickCoordinates[0],
			clickCoordinates[1]
		);

		if (!visibleRasterLayer) {
			debugInfo.error = 'Click outside raster bounds';
			debugInfo.rasterClicked = false;
			isLoading.set(false);
			return;
		}

		isLoading.set(true);
		try {
			debugInfo.rasterClicked = true;
			debugInfo.rasterName = visibleRasterLayer.name;

			const rasterValue = getRasterValueAtCoordinate(
				visibleRasterLayer,
				clickCoordinates[0],
				clickCoordinates[1]
			);

			debugInfo.rasterValue = rasterValue;

			if (rasterValue === null) {
				debugInfo.error = 'No raster value (likely ocean or no-data area)';
				debugInfo.rasterClicked = true;
				debugInfo.rasterName = visibleRasterLayer.name;
				isLoading.set(false);
				return;
			}

			const formattedLng = clickCoordinates[0].toFixed(4);
			const formattedLat = clickCoordinates[1].toFixed(4);

			const layerName = visibleRasterLayer.name;
			const metadata = visibleRasterLayer.layerMetadata;

			let heading = layerName;
			let subheading = 'Raster layer data';

			if (metadata) {
				heading = metadata.study || layerName;
				subheading = metadata.definition || 'Raster data';
			}

			popoverProperties = {
				heading,
				subheading,
				value: rasterValue,
				location: `${formattedLat}, ${formattedLng}`,
				layerName,
				source: metadata?.source || 'Raster Layer',
				hyperlink: metadata?.hyperlink || '#',
				footnote: `Value from "${layerName}" at ${formattedLng}, ${formattedLat}.`
			};

			popoverCoordinates = clickCoordinates;
			showPopover = true;
		} catch (error) {
			console.error('Error processing raster data for popover:', error);
		} finally {
			isLoading.set(false);
		}
	}

	function handleOpacityChange(event: CustomEvent<{ opacity: number }>) {
		globalOpacity = event.detail.opacity;
		if (map) {
			serializeFiltersToUrl(map, globalOpacity);
		}
	}

	function handleLocationFlightStart(
		event: CustomEvent<{ duration?: number; target?: 'location' | 'overview' }>
	) {
		if (disableFloatingDrone) return;

		const run = ++navigationFlightRun;
		const duration = event.detail.duration ?? 1800;
		const target = event.detail.target ?? 'location';
		const settleDelay = target === 'overview' ? 250 : 350;
		const finishFlight = () => {
			if (run !== navigationFlightRun) return;
			navigationDroneMode = 'idle';
			navigationDroneVisible = target === 'overview';
			navigationDroneTimer = null;
		};

		navigationDroneVisible = true;
		navigationDroneMode = 'transit';

		if (navigationDroneTimer) clearTimeout(navigationDroneTimer);
		navigationDroneTimer = setTimeout(finishFlight, duration + 650);

		map?.once('moveend', () => {
			if (run !== navigationFlightRun) return;
			if (navigationDroneTimer) clearTimeout(navigationDroneTimer);
			navigationDroneTimer = setTimeout(finishFlight, settleDelay);
		});
	}

	function clearWeespDemoTimers() {
		for (const timer of weespDemoTimers) clearTimeout(timer);
		weespDemoTimers = [];
		weespAnalysisPopupVisible = false;
	}

	function scheduleWeespDemoStep(delay: number, step: () => void) {
		const timer = setTimeout(step, delay);
		weespDemoTimers = [...weespDemoTimers, timer];
	}

	function setWeespLayerVisible(location: ProjectLocation, layerId: string, visible: boolean) {
		const layer = location.layers.find((item) => item.id === layerId);
		if (!layer) return;
		toggleProjectLayer(layer, visible);
		if (visible) updateProjectLayerOpacity(layer.id, weespLayerOpacity[layer.id] ?? (layer.opacity ?? 0.48));
	}

	function clearRenderedProjectLayers(location: ProjectLocation) {
		if (!map) return;
		for (const layer of location.layers) {
			const id = `project-${layer.id}`;
			try {
				if (map.getLayer(id)) map.removeLayer(id);
				if (map.getSource(id)) map.removeSource(id);
			} catch (error) {
				console.warn(`Unable to clear stale project layer ${id}`, error);
			}
		}
	}

	function runWeespDemoSequence() {
		const location = get(projectLocations).find((item) => item.id === 'weesp-castle');
		if (!location || !map) return;

		clearWeespDemoTimers();
		selectLocation(location.id);
		for (const layer of location.layers) setWeespLayerVisible(location, layer.id, false);
		clearRenderedProjectLayers(location);
		siteModelVisible = false;

		const duration = 6500;
		handleLocationFlightStart(
			new CustomEvent('flightstart', { detail: { duration, target: 'location' } })
		);
		map.flyTo({
			center: location.center,
			zoom: location.zoom,
			bearing: location.bearing ?? 0,
			pitch: location.pitch ?? 0,
			duration
		});

		weespRevealLayerIds.forEach((layerId, index) => {
			scheduleWeespDemoStep(1400 + index * 1050, () => setWeespLayerVisible(location, layerId, true));
		});

		scheduleWeespDemoStep(duration + 550, () => {
			weespAnalysisPopupVisible = true;
		});
		scheduleWeespDemoStep(duration + 3550, () => {
			weespAnalysisPopupVisible = false;
			setWeespLayerVisible(location, 'weesp-probability', true);
			siteModelVisible = true;
		});
	}

	function handleResetView() {
		runWeespDemoSequence();
	}

	function handleFloatingDroneToggle(event: CustomEvent<{ disabled: boolean }>) {
		disableFloatingDrone = event.detail.disabled;
		if (!disableFloatingDrone) {
			navigationDroneVisible = true;
			navigationDroneMode = 'idle';
			return;
		}

		navigationFlightRun++;
		if (navigationDroneTimer) clearTimeout(navigationDroneTimer);
		navigationDroneTimer = null;
		navigationDroneVisible = false;
		navigationDroneMode = 'idle';
		clearWeespDemoTimers();
	}

	function ensureSiteReconstructionLayers(location: ProjectLocation) {
		if (!map || !isStyleLoaded) return;

		const data = buildSiteReconstructionData(location.center);
		const existingSource = map.getSource(siteReconstructionSourceId) as
			| { setData?: (data: any) => void }
			| undefined;

		if (existingSource?.setData) {
			existingSource.setData(data);
		} else if (!existingSource) {
			map.addSource(siteReconstructionSourceId, {
				type: 'geojson',
				data: data as any
			});
		}

		if (!map.getLayer('weesp-site-moat-glow')) {
			map.addLayer({
				id: 'weesp-site-moat-glow',
				type: 'line',
				source: siteReconstructionSourceId,
				filter: ['==', ['get', 'class'], 'moat'],
				paint: {
					'line-color': '#39d2ff',
					'line-width': 6,
					'line-blur': 5,
					'line-opacity': 0.42
				}
			} as any);
		}

		if (!map.getLayer('weesp-site-moat-line')) {
			map.addLayer({
				id: 'weesp-site-moat-line',
				type: 'line',
				source: siteReconstructionSourceId,
				filter: ['==', ['get', 'class'], 'moat'],
				paint: {
					'line-color': '#39d2ff',
					'line-width': 2,
					'line-opacity': 0.95
				}
			} as any);
		}

		if (!map.getLayer('weesp-site-buildings')) {
			map.addLayer({
				id: 'weesp-site-buildings',
				type: 'fill-extrusion',
				source: siteReconstructionSourceId,
				filter: ['==', ['geometry-type'], 'Polygon'],
				paint: {
					'fill-extrusion-color': ['get', 'color'],
					'fill-extrusion-height': ['get', 'height'],
					'fill-extrusion-base': ['get', 'base'],
					'fill-extrusion-opacity': 0.42,
					'fill-extrusion-vertical-gradient': true
				}
			} as any);
		}

		if (!map.getLayer('weesp-site-wall-outlines')) {
			map.addLayer({
				id: 'weesp-site-wall-outlines',
				type: 'line',
				source: siteReconstructionSourceId,
				filter: ['==', ['get', 'class'], 'wall-outline'],
				paint: {
					'line-color': '#ff2da8',
					'line-width': 2.2,
					'line-opacity': 1
				}
			} as any);
		}

		setSiteReconstructionVisibility(siteModelVisible);
		setSiteReconstructionOpacity(siteModelOpacity);
		moveSiteReconstructionLayersToTop();
	}

	function setSiteReconstructionVisibility(visible: boolean) {
		if (!map) return;
		const visibility = visible ? 'visible' : 'none';
		for (const layerId of siteReconstructionLayerIds) {
			if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
		}
	}

	function setSiteReconstructionOpacity(opacityPercent: number) {
		if (!map) return;
		const opacity = Math.max(0, Math.min(1, opacityPercent / 100));
		for (const layerId of siteReconstructionLayerIds) {
			if (!map.getLayer(layerId)) continue;
			const value = (siteReconstructionBaseOpacity[layerId] ?? 1) * opacity;
			if (layerId === 'weesp-site-buildings') {
				map.setPaintProperty(layerId, 'fill-extrusion-opacity', value);
			} else {
				map.setPaintProperty(layerId, 'line-opacity', value);
			}
		}
	}

	function removeSiteReconstructionLayers() {
		if (!map) return;
		for (const layerId of [...siteReconstructionLayerIds].reverse()) {
			if (map.getLayer(layerId)) map.removeLayer(layerId);
		}
		if (map.getSource(siteReconstructionSourceId)) map.removeSource(siteReconstructionSourceId);
	}

	function moveSiteReconstructionLayersToTop() {
		if (!map) return;
		for (const layerId of siteReconstructionLayerIds) {
			if (map.getLayer(layerId)) map.moveLayer(layerId);
		}
	}

	function handleSiteModelToggle(event: CustomEvent<{ visible: boolean }>) {
		siteModelVisible = event.detail.visible;
		setSiteReconstructionVisibility(siteModelVisible);
		moveSiteReconstructionLayersToTop();
	}

	function handleSiteModelOpacity(event: CustomEvent<{ opacity: number }>) {
		siteModelOpacity = Math.max(0, Math.min(100, event.detail.opacity));
		if (!siteModelVisible) {
			siteModelVisible = true;
			setSiteReconstructionVisibility(true);
		}
		setSiteReconstructionOpacity(siteModelOpacity);
		moveSiteReconstructionLayersToTop();
	}

	function buildSiteReconstructionData(_center: [number, number]) {
		const uvToLngLat = (u: number, v: number): [number, number] => {
			const [imageU, imageV] = weespSiteUvToImageUv(u, v);
			const [west, south, east, north] = WEESP_IMAGE_BOUNDS;
			return [west + imageU * (east - west), north - imageV * (north - south)];
		};

		const polygon = (
			id: string,
			points: Array<[number, number]>,
			height: number,
			color = '#ff2da8',
			base = 1
		) => ({
			type: 'Feature',
			properties: { id, height, base, color },
			geometry: {
				type: 'Polygon',
				coordinates: [[...points, points[0]].map(([u, v]) => uvToLngLat(u, v))]
			}
		});

		const box = (id: string, left: number, top: number, right: number, bottom: number, height: number, color?: string) =>
			polygon(
				id,
				[
					[left, top],
					[right, top],
					[right, bottom],
					[left, bottom]
				],
				height,
				color
			);

		const rectLine = (id: string, className: string, left: number, top: number, right: number, bottom: number) =>
			line(id, className, [
				[left, top],
				[right, top],
				[right, bottom],
				[left, bottom]
			]);

		const line = (id: string, className: string, points: Array<[number, number]>, close = true) => ({
			type: 'Feature',
			properties: { id, class: className },
			geometry: {
				type: 'LineString',
				coordinates: (close ? [...points, points[0]] : points).map(([u, v]) => uvToLngLat(u, v))
			}
		});

		return {
			type: 'FeatureCollection',
			features: [
				box('west-tower', 0.405, 0.455, 0.485, 0.535, 7, '#cc2cff'),
				box('inner-keep', 0.545, 0.405, 0.63, 0.49, 10, '#ff2da8'),
				box('south-hall', 0.445, 0.575, 0.625, 0.685, 5, '#bd246f'),
				box('gate-wing', 0.365, 0.675, 0.46, 0.735, 4, '#bd246f'),
				box('east-wall', 0.695, 0.465, 0.745, 0.615, 5, '#d33487'),
				rectLine('outer-moat', 'moat', 0.32, 0.2, 0.8, 0.73),
				rectLine('inner-moat', 'moat', 0.405, 0.27, 0.735, 0.655),
				rectLine('tower-outline', 'wall-outline', 0.405, 0.455, 0.485, 0.535),
				rectLine('keep-outline', 'wall-outline', 0.545, 0.405, 0.63, 0.49),
				rectLine('hall-outline', 'wall-outline', 0.445, 0.575, 0.625, 0.685)
			]
		};
	}

	function getAnnotationCollection() {
		const features = [...annotationFeatures];
		if (activeAnnotation.length > 1) {
			features.push({
				type: 'Feature',
				properties: { id: 'active', active: true },
				geometry: { type: 'LineString', coordinates: activeAnnotation }
			});
		}

		return {
			type: 'FeatureCollection',
			features
		};
	}

	function ensureAnnotationLayers() {
		if (!map || !isStyleLoaded) return;

		if (!map.getSource(annotationsSourceId)) {
			map.addSource(annotationsSourceId, {
				type: 'geojson',
				data: getAnnotationCollection() as any
			});
		}

		if (!map.getLayer(annotationsHaloLayerId)) {
			map.addLayer({
				id: annotationsHaloLayerId,
				type: 'line',
				source: annotationsSourceId,
				paint: {
					'line-color': '#06131f',
					'line-width': ['case', ['boolean', ['get', 'active'], false], 8, 7],
					'line-opacity': 0.55,
					'line-blur': 2
				}
			} as any);
		}

		if (!map.getLayer(annotationsLayerId)) {
			map.addLayer({
				id: annotationsLayerId,
				type: 'line',
				source: annotationsSourceId,
				paint: {
					'line-color': ['case', ['boolean', ['get', 'active'], false], '#ffb84d', '#39d2ff'],
					'line-width': ['case', ['boolean', ['get', 'active'], false], 4, 3],
					'line-opacity': 0.95
				}
			} as any);
		}

		moveAnnotationLayersToTop();
	}

	function syncAnnotationLayers() {
		if (!map || !isStyleLoaded) return;
		ensureAnnotationLayers();
		const source = map.getSource(annotationsSourceId) as { setData?: (data: any) => void } | undefined;
		source?.setData?.(getAnnotationCollection());
		moveAnnotationLayersToTop();
	}

	function moveAnnotationLayersToTop() {
		if (!map) return;
		for (const layerId of [annotationsHaloLayerId, annotationsLayerId]) {
			if (map.getLayer(layerId)) map.moveLayer(layerId);
		}
	}

	function setAnnotationDrawingEnabled(enabled: boolean) {
		annotationDrawingEnabled = enabled;
		showPopover = false;
		if (!map) return;

		if (enabled) {
			map.dragPan.disable();
			map.getCanvas().style.cursor = 'crosshair';
			ensureAnnotationLayers();
		} else {
			finishActiveAnnotation();
			map.dragPan.enable();
			map.getCanvas().style.cursor = '';
		}
	}

	function handleAnnotationMouseDown(event: maplibregl.MapMouseEvent) {
		if (!annotationDrawingEnabled) return;
		(event as any).preventDefault?.();
		event.originalEvent?.preventDefault?.();
		showPopover = false;
		annotationIsDrawing = true;
		activeAnnotation = [[event.lngLat.lng, event.lngLat.lat]];
		syncAnnotationLayers();
	}

	function handleAnnotationMouseMove(event: maplibregl.MapMouseEvent) {
		if (!annotationDrawingEnabled || !annotationIsDrawing) return;
		addAnnotationPoint([event.lngLat.lng, event.lngLat.lat]);
	}

	function handleAnnotationMouseUp(event: maplibregl.MapMouseEvent) {
		if (!annotationDrawingEnabled || !annotationIsDrawing) return;
		addAnnotationPoint([event.lngLat.lng, event.lngLat.lat]);
		finishActiveAnnotation();
	}

	function addAnnotationPoint(point: AnnotationCoordinate) {
		const last = activeAnnotation[activeAnnotation.length - 1];
		if (last && Math.hypot(point[0] - last[0], point[1] - last[1]) < 0.000003) return;
		activeAnnotation = [...activeAnnotation, point];
		syncAnnotationLayers();
	}

	function finishActiveAnnotation() {
		if (!annotationIsDrawing) return;
		if (activeAnnotation.length > 1) {
			annotationFeatures = [
				...annotationFeatures,
				{
					type: 'Feature',
					properties: { id: `annotation-${Date.now()}` },
					geometry: { type: 'LineString', coordinates: activeAnnotation }
				}
			];
		}
		annotationIsDrawing = false;
		activeAnnotation = [];
		syncAnnotationLayers();
	}

	function undoAnnotation() {
		if (annotationIsDrawing) {
			annotationIsDrawing = false;
			activeAnnotation = [];
		} else {
			annotationFeatures = annotationFeatures.slice(0, -1);
		}
		syncAnnotationLayers();
	}

	function clearAnnotations() {
		annotationIsDrawing = false;
		activeAnnotation = [];
		annotationFeatures = [];
		syncAnnotationLayers();
	}

	onMount(async () => {
		// Register this component's ensureLayerOrder function globally for access from stores
		(window as any).__mapComponent = {
			ensureLayerOrder
		};

		const urlParams = await preloadData();
		if (urlParams.center) initialCenter = urlParams.center;
		if (urlParams.zoom) initialZoom = urlParams.zoom;
		if (urlParams.styleId) initialStyleId = urlParams.styleId;
		if (urlParams.opacity !== undefined) {
			globalOpacity = urlParams.opacity;
			updateAllRasterLayersOpacity(urlParams.opacity / 100);
		}

		if (initialStyleId) {
			const styleFromId = getStyleById(initialStyleId);
			if (styleFromId) {
				selectedMapStyle.set(styleFromId);
			} else {
				console.warn(`Initial style ID "${initialStyleId}" not found. Using default.`);
			}
		}

	});

	onDestroy(() => {
		if (navigationDroneTimer) clearTimeout(navigationDroneTimer);
		clearWeespDemoTimers();
		removeSiteReconstructionLayers();

		if ((window as any).__mapComponent) {
			delete (window as any).__mapComponent;
		}
		if ((window as any).__droneAtlasMap) {
			delete (window as any).__droneAtlasMap;
		}

		if (map) {
			map.off('mousemove', handleCursorChange);
			map.off('mousemove', debouncedHoverFast);
			map.off('mousemove', debouncedHoverDebug);
			map.off('mousedown', handleAnnotationMouseDown);
			map.off('mousemove', handleAnnotationMouseMove);
			map.off('mouseup', handleAnnotationMouseUp);
		}
	});

	$: if (map && isStyleLoaded) {
		if (map.loaded()) {
			map.once('idle', () => {
				if (map) {
					serializeFiltersToUrl(map, globalOpacity);
				}
			});
		}
	}

	$: if (map && isStyleLoaded) {
		annotationFeatures;
		activeAnnotation;
		syncAnnotationLayers();
	}

	$: if (map && isStyleLoaded) {
		if ($selectedLocation?.id === 'weesp-castle') {
			ensureSiteReconstructionLayers($selectedLocation);
			setSiteReconstructionVisibility(siteModelVisible);
			setSiteReconstructionOpacity(siteModelOpacity);
			moveSiteReconstructionLayersToTop();
		} else {
			removeSiteReconstructionLayers();
		}
	}

	// Function to ensure layer order after visualization changes
	export function ensureLayerOrder() {
		if (
			map &&
			isStyleLoaded &&
			rasterLayerManager &&
			typeof rasterLayerManager.ensureCorrectLayerOrder === 'function'
		) {
			map.once('idle', () => {
				rasterLayerManager.ensureCorrectLayerOrder();
				moveSiteReconstructionLayersToTop();
			});
		}
	}

	// Function to handle raster visibility changes
	export function handleRasterVisibilityChange() {
		if (
			map &&
			isStyleLoaded &&
			rasterLayerManager &&
			typeof rasterLayerManager.ensureCorrectLayerOrder === 'function'
		) {
			map.once('idle', () => {
				rasterLayerManager.ensureCorrectLayerOrder();
				moveSiteReconstructionLayersToTop();
			});
		}
	}
</script>

<div id="map-container" class="mission-map relative h-full overflow-hidden bg-[#05080d] text-slate-100">
	<MapCore
		{initialCenter}
		{initialZoom}
		{initialStyleId}
		bind:map
		on:ready={handleMapReady}
		on:styleChange={handleStyleChange}
			on:click={handleMapClick}
	/>

	<div class="map-atmosphere pointer-events-none absolute inset-0 z-[5]"></div>

	<header class="mission-topbar absolute left-0 right-0 top-0 z-50">
		<div class="brand-lockup">
			<div class="brand-mark"><span></span></div>
			<div>
				<div class="brand-name">Drone<span>ATLAS</span></div>
				<div class="brand-subtitle">Spatial intelligence workspace</div>
			</div>
		</div>

		<div class="mission-status">
			<div class="status-chip live"><span></span> live raster analysis</div>
			<div class="status-chip">{visibleLayerCount} active layers</div>
			<div class="status-chip location-chip">
				{$selectedLocation ? $selectedLocation.name : 'Netherlands overview'}
			</div>
		</div>

		<button class="reset-button" type="button" onclick={handleResetView}>Reset view</button>
	</header>

	<HeroDrone visible={!disableFloatingDrone && navigationDroneVisible} mode={navigationDroneMode} zIndex={8} />
	<div
		class:navigation-active={!disableFloatingDrone && navigationDroneMode === 'transit'}
		class="navigation-cinema pointer-events-none absolute inset-0 z-[7]"
	></div>

	{#if map}
		<MapControls {map} position="top-right" />
	{/if}

	{#if map}
		<div
			class="annotation-toolbar absolute bottom-6 right-4 z-50 flex flex-col items-end gap-2"
			class:panelOpen={Boolean($selectedLocation)}
		>
			<div class="annotation-actions flex items-center gap-1 rounded-lg p-1 shadow-lg backdrop-blur-md">
				<button
					class="btn btn-sm"
					class:btn-primary={annotationDrawingEnabled}
					class:btn-ghost={!annotationDrawingEnabled}
					onclick={() => setAnnotationDrawingEnabled(!annotationDrawingEnabled)}
				>
					{annotationDrawingEnabled ? 'Drawing on' : 'Draw'}
				</button>
				<button
					class="btn btn-ghost btn-sm"
					disabled={annotationFeatures.length === 0 && !annotationIsDrawing}
					onclick={undoAnnotation}
				>
					Undo
				</button>
				<button
					class="btn btn-ghost btn-sm"
					disabled={annotationFeatures.length === 0 && !annotationIsDrawing}
					onclick={clearAnnotations}
				>
					Clear
				</button>
			</div>
			{#if annotationDrawingEnabled}
				<div class="annotation-help max-w-64 rounded-lg px-3 py-2 text-xs shadow-lg backdrop-blur-md">
					Drag on the map to sketch an annotation. Drawing mode disables map panning until turned off.
				</div>
			{/if}
		</div>
	{/if}

	{#if map && isStyleLoaded}
		<RasterLayerManager {map} {isStyleLoaded} bind:globalOpacity bind:this={rasterLayerManager} />
	{/if}

	<!-- Project Locations Sidebar (includes settings) -->
	<LocationsSidebar
		{map}
		bind:globalOpacity
		bind:disableFloatingDrone
		on:flightstart={handleLocationFlightStart}
		on:weespdemostart={runWeespDemoSequence}
		on:floatingdronetoggle={handleFloatingDroneToggle}
		on:opacitychange={handleOpacityChange}
		on:overlaytoggle={() => {
			// Heavy red-pixel debug overlay intentionally disabled for the demo.
		}}
	/>

	<LocationAnalyticsPanel
		{siteModelVisible}
		{siteModelOpacity}
		on:sitemodeltoggle={handleSiteModelToggle}
		on:sitemodelopacity={handleSiteModelOpacity}
	/>

	{#if weespAnalysisPopupVisible}
		<div class="weesp-analysis-popup pointer-events-none absolute z-[80]">
			<div class="scan-ring"></div>
			<div>
				<div class="analysis-title">Analysing tree...</div>
				<div class="analysis-subtitle">Fusing LiDAR, NDVI, thermal, and probability evidence</div>
			</div>
			<div class="analysis-bars" aria-hidden="true"><span></span><span></span><span></span></div>
		</div>
	{/if}

	{#if map && isStyleLoaded}
		<RasterLegend visible={true} />
	{/if}

	<!-- Hover Tooltip - follows mouse cursor -->
	{#if debugInfo.hoverInRaster && debugInfo.hoverRasterValue !== null && debugInfo.hoverMousePos && !showPopover}
		<div
			class="raster-cursor-dot pointer-events-none fixed z-[999] h-2 w-2"
			style="left: {debugInfo.hoverMousePos.x}px; top: {debugInfo.hoverMousePos
				.y}px; transform: translate(-50%, -50%);"
		></div>
		<div
			class="raster-tooltip pointer-events-none fixed z-[1000] whitespace-nowrap px-2 py-1 text-xs"
			style="left: {debugInfo.hoverMousePos.x}px; top: {debugInfo.hoverMousePos
				.y}px; transform: translate(10px, -115%);"
		>
			{isProbabilityLayerName(debugInfo.hoverRasterName) ? 'Prediction' : 'Value'}:
			{formatHoverRasterValue(debugInfo.hoverRasterValue, debugInfo.hoverRasterName)}
		</div>
	{/if}

	{#if $isLoading}
		<div class="mission-loading fixed bottom-6 left-24 z-[1000] w-auto shadow-lg">
			<span class="text-sm font-medium">{$loadingMessage || 'Loading...'}</span>
		</div>
	{/if}

	{#if $dataError}
		<div class="error-overlay">
			<div class="error-container">
				<div class="error-icon">Warning</div>
				<div class="error-message">Error: {$dataError}</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.map-atmosphere {
		background:
			radial-gradient(circle at 22% 18%, rgba(97, 216, 255, 0.13), transparent 30%),
			radial-gradient(circle at 72% 28%, rgba(255, 155, 84, 0.12), transparent 28%),
			linear-gradient(90deg, rgba(3, 8, 14, 0.55), transparent 22%, transparent 74%, rgba(3, 8, 14, 0.74)),
			radial-gradient(ellipse at center, transparent 44%, rgba(3, 7, 12, 0.46) 100%);
		mix-blend-mode: screen;
	}

	.mission-topbar {
		display: grid;
		grid-template-columns: auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 18px;
		min-height: 68px;
		padding: 12px 16px;
		border-bottom: 1px solid rgba(167, 213, 255, 0.12);
		background:
			linear-gradient(180deg, rgba(6, 10, 17, 0.9), rgba(6, 10, 17, 0.56)),
			radial-gradient(circle at 18% 0%, rgba(97, 216, 255, 0.12), transparent 36%);
		box-shadow: 0 18px 52px rgba(0, 0, 0, 0.38);
		backdrop-filter: blur(18px) saturate(140%);
	}

	.brand-lockup {
		display: flex;
		align-items: center;
		gap: 10px;
		min-width: 218px;
	}

	.brand-mark {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 1px solid rgba(97, 216, 255, 0.34);
		border-radius: 12px;
		background: rgba(97, 216, 255, 0.08);
		box-shadow: 0 0 28px rgba(97, 216, 255, 0.18), inset 0 0 18px rgba(97, 216, 255, 0.1);
	}

	.brand-mark span {
		width: 14px;
		height: 14px;
		border: 2px solid #9de9ff;
		border-radius: 50%;
		box-shadow: 0 0 16px #61d8ff;
	}

	.brand-name {
		font-size: 14px;
		font-weight: 650;
		letter-spacing: 0.02em;
		line-height: 1;
	}

	.brand-name span {
		font-weight: 900;
		color: #b9f1ff;
	}

	.brand-subtitle {
		margin-top: 4px;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(232, 241, 255, 0.44);
	}

	.mission-status {
		display: flex;
		min-width: 0;
		align-items: center;
		justify-content: center;
		gap: 8px;
	}

	.status-chip,
	.reset-button,
	.mission-loading,
	.raster-tooltip {
		border: 1px solid rgba(167, 213, 255, 0.14);
		background: rgba(8, 13, 21, 0.72);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 14px 30px rgba(0, 0, 0, 0.28);
		backdrop-filter: blur(14px);
	}

	.status-chip {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		min-width: 0;
		max-width: 290px;
		overflow: hidden;
		padding: 7px 10px;
		border-radius: 999px;
		font-size: 10px;
		font-weight: 850;
		letter-spacing: 0.12em;
		text-overflow: ellipsis;
		text-transform: uppercase;
		white-space: nowrap;
		color: rgba(232, 241, 255, 0.72);
	}

	.status-chip.live {
		border-color: rgba(103, 233, 133, 0.2);
		color: rgba(204, 255, 216, 0.82);
	}

	.status-chip.live span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #67e985;
		box-shadow: 0 0 14px #67e985;
	}

	.reset-button {
		padding: 9px 13px;
		border-radius: 12px;
		font-size: 11px;
		font-weight: 850;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: rgba(232, 241, 255, 0.8);
		transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
	}

	.reset-button:hover {
		transform: translateY(-1px);
		border-color: rgba(97, 216, 255, 0.4);
		background: rgba(97, 216, 255, 0.1);
	}

	.weesp-analysis-popup {
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 18px;
		min-width: min(560px, 72vw);
		padding: 24px 28px;
		border: 1px solid rgba(97, 216, 255, 0.38);
		border-radius: 28px;
		background: linear-gradient(135deg, rgba(7, 12, 22, 0.94), rgba(16, 25, 38, 0.8));
		box-shadow: 0 26px 80px rgba(0, 0, 0, 0.52), 0 0 42px rgba(97, 216, 255, 0.2);
		backdrop-filter: blur(18px) saturate(140%);
		color: white;
	}

	.scan-ring {
		width: 54px;
		height: 54px;
		border: 2px solid rgba(97, 216, 255, 0.18);
		border-top-color: #61d8ff;
		border-right-color: #67e985;
		border-radius: 999px;
		box-shadow: 0 0 24px rgba(97, 216, 255, 0.26);
		animation: scan-spin 1.1s linear infinite;
	}

	.analysis-title {
		font-size: clamp(22px, 2.7vw, 36px);
		font-weight: 700;
		letter-spacing: -0.04em;
	}

	.analysis-subtitle {
		margin-top: 6px;
		font-size: clamp(12px, 1.25vw, 16px);
		color: rgba(255, 255, 255, 0.68);
	}

	.analysis-bars {
		display: flex;
		align-items: end;
		gap: 4px;
		height: 34px;
	}

	.analysis-bars span {
		width: 5px;
		border-radius: 99px;
		background: #61d8ff;
		animation: analyse-bar 0.8s ease-in-out infinite alternate;
	}

	.analysis-bars span:nth-child(1) {
		height: 14px;
	}

	.analysis-bars span:nth-child(2) {
		height: 26px;
		animation-delay: 0.12s;
		background: #67e985;
	}

	.analysis-bars span:nth-child(3) {
		height: 20px;
		animation-delay: 0.24s;
		background: #ffb84d;
	}

	@keyframes scan-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@keyframes analyse-bar {
		to {
			transform: scaleY(0.42);
			opacity: 0.55;
		}
	}

	.annotation-toolbar.panelOpen {
		right: 392px;
	}

	.annotation-actions,
	.annotation-help {
		border: 1px solid rgba(167, 213, 255, 0.14);
		background: rgba(8, 13, 21, 0.78);
		color: rgba(232, 241, 255, 0.78);
	}

	.annotation-actions :global(.btn) {
		min-height: 2rem;
		height: 2rem;
		border-radius: 9px;
		border-color: rgba(167, 213, 255, 0.12);
		background: rgba(255, 255, 255, 0.04);
		color: rgba(232, 241, 255, 0.78);
	}

	.annotation-actions :global(.btn-primary) {
		border-color: rgba(97, 216, 255, 0.42);
		background: rgba(97, 216, 255, 0.18);
		color: #e8f8ff;
	}

	.raster-cursor-dot {
		border: 1px solid #f7fdff;
		border-radius: 50%;
		background: #ff9b54;
		box-shadow: 0 0 0 4px rgba(255, 155, 84, 0.15), 0 0 18px rgba(255, 155, 84, 0.72);
	}

	.raster-tooltip {
		border-radius: 10px;
		color: rgba(232, 241, 255, 0.92);
		font-weight: 750;
	}

	.mission-loading {
		padding: 10px 14px;
		border-radius: 14px;
		color: rgba(232, 241, 255, 0.86);
	}

	:global(.mission-map .maplibregl-ctrl-bottom-right) {
		display: none;
	}

	:global(.mission-map .maplibregl-canvas) {
		filter: saturate(1.25) brightness(0.72) contrast(1.12);
	}

	:global(.mission-map .maplibregl-ctrl-scale) {
		border-color: rgba(232, 241, 255, 0.48);
		color: rgba(232, 241, 255, 0.74);
		background: rgba(8, 13, 21, 0.42);
		font-weight: 700;
		text-shadow: none;
	}

	.error-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(3, 7, 12, 0.82);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1001;
	}

	.error-container {
		background: rgba(8, 13, 21, 0.92);
		border: 1px solid rgba(255, 155, 84, 0.25);
		border-radius: 18px;
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
		color: #ffe6d1;
		padding: 20px;
		max-width: 400px;
		text-align: center;
	}

	.error-icon {
		font-size: 36px;
		margin-bottom: 10px;
	}

	.navigation-cinema {
		opacity: 0;
		transition: opacity 0.28s ease-out;
		background:
			radial-gradient(circle at 70% 35%, rgba(57, 210, 255, 0.16), transparent 28%),
			linear-gradient(115deg, transparent 0 44%, rgba(57, 210, 255, 0.08) 48%, transparent 58%),
			radial-gradient(ellipse at center, transparent 48%, rgba(3, 8, 14, 0.34) 100%);
		mix-blend-mode: screen;
	}
	.navigation-cinema.navigation-active {
		opacity: 1;
	}

	@media (max-width: 1023px) {
		.mission-topbar {
			grid-template-columns: auto auto;
			min-height: 64px;
			gap: 10px;
		}

		.brand-lockup {
			min-width: 0;
		}

		.brand-subtitle,
		.location-chip,
		.mission-status .status-chip:nth-child(2) {
			display: none;
		}

		.mission-status {
			justify-content: flex-end;
		}

		.reset-button {
			display: none;
		}

		.annotation-toolbar,
		.annotation-toolbar.panelOpen {
			right: 12px;
			bottom: calc(44vh + 28px);
		}

		.mission-loading {
			left: 12px;
			bottom: 12px;
		}
	}

	@media (max-width: 640px) {
		.mission-topbar {
			padding: 10px 12px;
		}

		.brand-name {
			font-size: 13px;
		}

		.status-chip.live {
			max-width: 148px;
			font-size: 9px;
		}
	}
</style>
