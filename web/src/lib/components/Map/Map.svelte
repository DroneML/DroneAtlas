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
	import MapSidebar from './components/MapSidebar.svelte';
	import RasterLegend from './components/RasterLegend.svelte';
	import RasterDataOverlay from './components/RasterDataOverlay.svelte';
	import type { RasterLayer } from '$lib/types';

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
	let showRasterDataOverlay = false; // Hide red pixels by default

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
		if ((window as any).__mapComponent) {
			delete (window as any).__mapComponent;
		}

		if (map) {
			map.off('mousemove', handleCursorChange);
			map.off('mousemove', debouncedHoverFast);
			map.off('mousemove', debouncedHoverDebug);
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

	{#if map}
		<MapControls {map} position="top-right" />
	{/if}

	{#if map && isStyleLoaded}
		<RasterLayerManager {map} {isStyleLoaded} bind:globalOpacity bind:this={rasterLayerManager} />
	{/if}

	<div class="absolute left-6 top-16 z-10">
		<MapSidebar
			class="hidden sm:block"
			bind:globalOpacity
			on:opacitychange={handleOpacityChange}
			on:overlaytoggle={(e) => {
				showRasterDataOverlay = e.detail.visible;
			}}
		/>
	</div>

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
</style>
