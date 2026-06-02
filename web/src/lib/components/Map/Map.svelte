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
	import { serializeFiltersToUrl, debounce } from './utils/urlParams';
	import { preloadData } from './utils/MapInitializer';
	import {
		getRasterValueAtCoordinate,
		getRasterValueAtCoordinateFast,
		findVisibleRasterLayerAtCoordinate
	} from './utils/rasterPixelQuery';
	import type { AnnotationCoordinate, AnnotationFeature } from './utils/annotationLayers';
	import {
		ensureAnnotationLayers as ensureMapAnnotationLayers,
		syncAnnotationLayers as syncMapAnnotationLayers
	} from './utils/annotationLayers';
	import {
		ensureSiteReconstructionLayers,
		moveSiteReconstructionLayersToTop,
		removeSiteReconstructionLayers,
		setSiteReconstructionOpacity,
		setSiteReconstructionVisibility
	} from './utils/siteReconstruction';

	// Import modularized components
	import MapCore from './components/MapCore.svelte';
	import MapControls from './components/MapControls.svelte';
	import RasterLayerManager from './components/RasterLayerManager.svelte';
	import RasterLegend from './components/RasterLegend.svelte';
	import LocationsSidebar from './components/LocationsSidebar.svelte';
	import LocationAnalyticsPanel from './components/LocationAnalyticsPanel.svelte';
	import MissionTopbar from './components/MissionTopbar.svelte';
	import AnnotationToolbar from './components/AnnotationToolbar.svelte';
	import RasterHoverTooltip from './components/RasterHoverTooltip.svelte';
	import WeespAnalysisPopup from './components/WeespAnalysisPopup.svelte';
	import HeroDrone from '$lib/demo/components/HeroDrone.svelte';
	import {
		projectLocations,
		selectedLocation,
		selectLocation,
		toggleProjectLayer,
		updateProjectLayerOpacity
	} from '$lib/stores/projects.store';
	import { get } from 'svelte/store';
	import type { ProjectLocation } from '$lib/types';

	// Props that can be passed to the component
	export let initialCenter: [number, number] = [-25, 16]; // Default center coordinates [lng, lat]
	export let initialZoom: number = 2; // Default zoom level
	export let initialStyleId: string | null = null; // Optional style ID to use

	// Track the global opacity value for raster layers
	let globalOpacity = 80; // Default to 80%

	// Map instance and state
	let map: MaplibreMap | null = null;
	let isStyleLoaded = false;

	// Debug overlay state
	let disableFloatingDrone = false;
	let navigationDroneVisible = true;
	let navigationDroneMode: 'idle' | 'transit' = 'idle';
	let navigationDroneTimer: ReturnType<typeof setTimeout> | null = null;
	let navigationFlightRun = 0;
	let siteModelVisible = true;
	let siteModelOpacity = 100;
	let weespAnalysisPopupVisible = false;
	let weespDemoTimers: ReturnType<typeof setTimeout>[] = [];
	const weespLayerOpacity: Record<string, number> = {
		'weesp-lidar': 0.56,
		'weesp-multispectral': 0.38,
		'weesp-thermal': 0.42,
		'weesp-probability': 0.62
	};
	const weespRevealLayerIds = ['weesp-lidar', 'weesp-multispectral', 'weesp-thermal'];
	const lockCameraAtWeespDemoEnd = false;
	let hasInitializedWeespFinalState = false;
	let annotationDrawingEnabled = false;
	let annotationIsDrawing = false;
	let annotationFeatures: AnnotationFeature[] = [];
	let activeAnnotation: AnnotationCoordinate[] = [];
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
		if (lockCameraAtWeespDemoEnd) {
			showWeespDemoFinalState();
		} else {
			map.jumpTo({ center: [5.5, 52.0], zoom: 7, bearing: 0, pitch: 0 });
			navigationDroneVisible = !disableFloatingDrone;
			navigationDroneMode = 'idle';
		}

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
				if (lockCameraAtWeespDemoEnd) applyCurrentWeespReconstructionState();
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
			navigationDroneVisible = target === 'overview';
			if (target === 'overview') navigationDroneMode = 'idle';
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
			scheduleWeespDemoStep(duration + 900 + index * 1050, () => setWeespLayerVisible(location, layerId, true));
		});

		scheduleWeespDemoStep(duration + 600, () => {
			weespAnalysisPopupVisible = true;
		});
		scheduleWeespDemoStep(duration + 4450, () => {
			weespAnalysisPopupVisible = false;
			setWeespLayerVisible(location, 'weesp-probability', true);
			siteModelVisible = true;
		});
	}

	function showWeespDemoFinalState() {
		const location = get(projectLocations).find((item) => item.id === 'weesp-castle');
		if (!location || !map) return;

		clearWeespDemoTimers();
		selectLocation(location.id);
		for (const layer of location.layers) setWeespLayerVisible(location, layer.id, true);
		weespAnalysisPopupVisible = false;
		siteModelVisible = true;
		if (!hasInitializedWeespFinalState) {
			siteModelOpacity = 100;
			hasInitializedWeespFinalState = true;
		}
		map.jumpTo({
			center: location.center,
			zoom: location.zoom,
			bearing: location.bearing ?? 0,
			pitch: location.pitch ?? 0
		});
		applySiteReconstructionState(location);
	}

	function applyCurrentWeespReconstructionState() {
		const location = get(projectLocations).find((item) => item.id === 'weesp-castle');
		if (location) applySiteReconstructionState(location);
	}

	function applySiteReconstructionState(location: ProjectLocation) {
		ensureSiteReconstructionLayers(map, isStyleLoaded, location, siteModelVisible, siteModelOpacity);
		setSiteReconstructionVisibility(map, true);
		setSiteReconstructionOpacity(map, siteModelOpacity);
		moveSiteReconstructionLayersToTop(map);
	}

	function handleResetView() {
		if (lockCameraAtWeespDemoEnd) {
			showWeespDemoFinalState();
			return;
		}

		clearWeespDemoTimers();
		selectLocation(null);
		if (!map) return;

		const duration = 1500;
		handleLocationFlightStart(new CustomEvent('flightstart', { detail: { duration, target: 'overview' } }));
		map.flyTo({ center: [5.5, 52.0], zoom: 7, bearing: 0, pitch: 0, duration });
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

	function handleSiteModelToggle(event: CustomEvent<{ visible: boolean }>) {
		siteModelVisible = event.detail.visible;
		setSiteReconstructionVisibility(map, siteModelVisible);
		moveSiteReconstructionLayersToTop(map);
	}

	function handleSiteModelOpacity(event: CustomEvent<{ opacity: number }>) {
		siteModelOpacity = Math.max(0, Math.min(100, event.detail.opacity));
		if (!siteModelVisible) {
			siteModelVisible = true;
			setSiteReconstructionVisibility(map, true);
		}
		setSiteReconstructionOpacity(map, siteModelOpacity);
		moveSiteReconstructionLayersToTop(map);
	}

	function setAnnotationDrawingEnabled(enabled: boolean) {
		annotationDrawingEnabled = enabled;
		showPopover = false;
		if (!map) return;

		if (enabled) {
			map.dragPan.disable();
			map.getCanvas().style.cursor = 'crosshair';
			ensureMapAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
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
		syncMapAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
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
		syncMapAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
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
		syncMapAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
	}

	function undoAnnotation() {
		if (annotationIsDrawing) {
			annotationIsDrawing = false;
			activeAnnotation = [];
		} else {
			annotationFeatures = annotationFeatures.slice(0, -1);
		}
		syncMapAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
	}

	function clearAnnotations() {
		annotationIsDrawing = false;
		activeAnnotation = [];
		annotationFeatures = [];
		syncMapAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
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
		removeSiteReconstructionLayers(map);

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
		syncMapAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
	}

	$: if (map && isStyleLoaded) {
		if ($selectedLocation?.id === 'weesp-castle') {
			ensureSiteReconstructionLayers(map, isStyleLoaded, $selectedLocation, siteModelVisible, siteModelOpacity);
			setSiteReconstructionVisibility(map, siteModelVisible);
			setSiteReconstructionOpacity(map, siteModelOpacity);
			moveSiteReconstructionLayersToTop(map);
		} else {
			removeSiteReconstructionLayers(map);
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
				moveSiteReconstructionLayersToTop(map);
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
				moveSiteReconstructionLayersToTop(map);
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

	<MissionTopbar
		{visibleLayerCount}
		selectedLocationName={$selectedLocation ? $selectedLocation.name : 'Netherlands overview'}
		onResetView={handleResetView}
	/>

	<HeroDrone visible={!disableFloatingDrone && navigationDroneVisible} mode={navigationDroneMode} zIndex={8} />
	<div
		class:navigation-active={!disableFloatingDrone && navigationDroneMode === 'transit'}
		class="navigation-cinema pointer-events-none absolute inset-0 z-[7]"
	></div>

	{#if map}
		<MapControls {map} position="top-right" />
	{/if}

	{#if map}
		<AnnotationToolbar
			panelOpen={Boolean($selectedLocation)}
			{annotationDrawingEnabled}
			canUndoOrClear={annotationFeatures.length > 0 || annotationIsDrawing}
			onToggleDrawing={() => setAnnotationDrawingEnabled(!annotationDrawingEnabled)}
			onUndo={undoAnnotation}
			onClear={clearAnnotations}
		/>
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
		<WeespAnalysisPopup />
	{/if}

	{#if map && isStyleLoaded}
		<RasterLegend visible={true} />
	{/if}

	<RasterHoverTooltip
		hoverInRaster={debugInfo.hoverInRaster}
		hoverRasterValue={debugInfo.hoverRasterValue}
		hoverRasterName={debugInfo.hoverRasterName}
		hoverMousePos={debugInfo.hoverMousePos}
		{showPopover}
	/>

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

	.mission-loading {
		border: 1px solid rgba(167, 213, 255, 0.14);
		background: rgba(8, 13, 21, 0.72);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 14px 30px rgba(0, 0, 0, 0.28);
		backdrop-filter: blur(14px);
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
		.mission-loading {
			left: 12px;
			bottom: 12px;
		}
	}
</style>
