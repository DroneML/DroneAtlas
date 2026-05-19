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
	import RasterDataOverlay from './components/RasterDataOverlay.svelte';
	import LocationsSidebar from './components/LocationsSidebar.svelte';
	import HeroDrone from '$lib/demo/components/HeroDrone.svelte';
	import { selectedLocation } from '$lib/stores/projects.store';
	import { DroneLayer } from '$lib/demo/DroneLayer';
	import { generateFlightPath } from '$lib/demo/path';
	import { syntheticHeightfield } from '$lib/demo/mlHeightfield';
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
	let showRasterDataOverlay = false; // Hide red pixels by default
	let navigationDroneVisible = true;
	let navigationDroneMode: 'idle' | 'transit' = 'idle';
	let navigationDroneTimer: ReturnType<typeof setTimeout> | null = null;
	let navigationFlightRun = 0;
	let paperDemoLayer: DroneLayer | null = null;
	let paperDemoAnimation: number | null = null;
	let paperDemoStartedAt = 0;
	const paperDemoLayerId = 'weesp-paper-survey';
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
		} else {
			debugInfo.hoverInRaster = false;
			debugInfo.hoverRasterValue = null;
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

	function ensurePaperDemoLayer(location: ProjectLocation) {
		if (!map || !isStyleLoaded || map.getLayer(paperDemoLayerId)) return;

		stopPaperDemoLayer();

		const path = generateFlightPath({
			center: location.center,
			passes: 5,
			passLengthKm: 0.42,
			passSpacingM: 42,
			baseAlt: 72
		});
		const layer = new DroneLayer({ path, id: paperDemoLayerId });
		map.addLayer(layer);

		const heightfield = syntheticHeightfield(location.center, 0.0035, 128);
		layer.setFindingHeightfield(heightfield, { heightMeters: 44 });
		layer.setVisibility({ drone: true, path: true, particles: true, finding: true });
		layer.setProgress(0);
		layer.setParticleIntensity(0.35);

		paperDemoLayer = layer;
		paperDemoStartedAt = performance.now();
		animatePaperDemoLayer();
	}

	function animatePaperDemoLayer(ts = performance.now()) {
		if (!paperDemoLayer) return;
		const progress = ((ts - paperDemoStartedAt) % 12000) / 12000;
		paperDemoLayer.setProgress(progress);
		paperDemoLayer.setParticleIntensity(0.22 + Math.sin(progress * Math.PI) * 0.32);
		paperDemoAnimation = requestAnimationFrame(animatePaperDemoLayer);
	}

	function stopPaperDemoLayer() {
		if (paperDemoAnimation !== null) {
			cancelAnimationFrame(paperDemoAnimation);
			paperDemoAnimation = null;
		}

		if (map?.getLayer(paperDemoLayerId)) {
			map.removeLayer(paperDemoLayerId);
		}
		paperDemoLayer = null;
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
		stopPaperDemoLayer();

		if ((window as any).__mapComponent) {
			delete (window as any).__mapComponent;
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
			ensurePaperDemoLayer($selectedLocation);
		} else {
			stopPaperDemoLayer();
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
			});
		}
	}
</script>

<div id="map-container" class="relative h-full">
	<MapCore
		{initialCenter}
		{initialZoom}
		{initialStyleId}
		bind:map
		on:ready={handleMapReady}
		on:styleChange={handleStyleChange}
		on:click={handleMapClick}
	/>

	<HeroDrone visible={navigationDroneVisible} mode={navigationDroneMode} zIndex={8} />
	<div
		class:navigation-active={navigationDroneMode === 'transit'}
		class="navigation-cinema pointer-events-none absolute inset-0 z-[7]"
	></div>

	{#if map}
		<MapControls {map} position="top-right" />
	{/if}

	{#if map}
		<div class="annotation-toolbar absolute bottom-6 right-4 z-50 flex flex-col items-end gap-2">
			<div class="flex items-center gap-1 rounded-lg border border-base-300/50 bg-base-100/90 p-1 shadow-lg backdrop-blur-md">
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
				<div class="max-w-64 rounded-lg border border-primary/20 bg-base-100/90 px-3 py-2 text-xs text-base-content/65 shadow-lg backdrop-blur-md">
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
		on:flightstart={handleLocationFlightStart}
		on:opacitychange={handleOpacityChange}
		on:overlaytoggle={(e) => {
			showRasterDataOverlay = e.detail.visible;
		}}
	/>

	{#if map && isStyleLoaded}
		<RasterLegend visible={true} />
	{/if}

	<!-- Raster Data Overlay - shows red pixels for all raster data -->
	{#if map && isStyleLoaded}
		<RasterDataOverlay {map} visible={showRasterDataOverlay} />
	{/if}

	<!-- Hover Tooltip - follows mouse cursor -->
	{#if debugInfo.hoverInRaster && debugInfo.hoverRasterValue !== null && debugInfo.hoverMousePos && !showPopover}
		<div
			class="pointer-events-none fixed z-[999] h-2 w-2 bg-red-500"
			style="left: {debugInfo.hoverMousePos.x}px; top: {debugInfo.hoverMousePos
				.y}px; transform: translate(-50%, -50%); border: 1px solid white;"
		></div>
		<div
			class="pointer-events-none fixed z-[1000] whitespace-nowrap rounded bg-black/90 px-2 py-1 text-xs text-white"
			style="left: {debugInfo.hoverMousePos.x}px; top: {debugInfo.hoverMousePos
				.y}px; transform: translate(-50%, -50%);"
		>
			Value: {debugInfo.hoverRasterValue}
		</div>
	{/if}

	{#if $isLoading}
		<div class="alert fixed bottom-6 left-4 z-[1000] w-auto shadow-lg">
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
	/* Error display */
	.error-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(255, 255, 255, 0.85);
		display: flex;
		justify-content: center;
		align-items: center;
		z-index: 1001;
	}

	.error-container {
		background-color: white;
		border-radius: 8px;
		box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
</style>
