<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { Map as MaplibreMap } from 'maplibre-gl';
	import type { ProjectLayerDef } from '$lib/types';
	import {
		projectLocations,
		selectedLocationId,
		selectedLocation,
		enabledProjectLayers,
		selectLocation,
		toggleProjectLayer,
		updateProjectLayerOpacity,
		getLayerTypeColor
	} from '$lib/stores/projects.store';
	import { rasterLayers, updateAllRasterLayersOpacity } from '$lib/stores/raster.store';
	import { getGradientStyle, getLegendInfo, formatTickValue, computeTicks } from '../utils/colormapDefinitions';
	import {
		loadStoredSettings,
		saveSettingsToStorage
	} from '$lib/stores/visualizationSettings/localStorage';
	import { onMount } from 'svelte';
	import MaterialSymbolsSettingsOutlineRounded from '~icons/material-symbols/settings-outline-rounded';

	export let map: MaplibreMap | null = null;
	export let globalOpacity: number = 80;

	let collapsed = false;
	let showSettingsModal = false;
	let showRasterDataOverlayLocal = false;

	// Track per-layer opacity locally for slider responsiveness
	let layerOpacities: Record<string, number> = {};

	const dispatch = createEventDispatcher();

	onMount(() => {
		const storedSettings = loadStoredSettings();
		globalOpacity = storedSettings.globalOpacity;
		updateAllRasterLayersOpacity(globalOpacity / 100);
		showRasterDataOverlayLocal = storedSettings.showRasterDataOverlay;
		dispatch('overlaytoggle', { visible: showRasterDataOverlayLocal });
	});

	function handleLocationClick(locationId: string) {
		const locations = $projectLocations;
		const location = locations.find((l) => l.id === locationId);
		if (!location) return;

		selectLocation(locationId);

		// Initialize opacity map from layer defaults
		layerOpacities = {};
		for (const layer of location.layers) {
			layerOpacities[layer.id] = (layer.opacity ?? 0.8) * 100;
		}

		if (map) {
			map.flyTo({
				center: location.center,
				zoom: location.zoom,
				bearing: location.bearing ?? 0,
				pitch: location.pitch ?? 0,
				duration: 2000
			});
		}
	}

	function handleBackClick() {
		selectLocation(null);
		layerOpacities = {};

		if (map) {
			map.flyTo({
				center: [5.5, 52.0],
				zoom: 7,
				bearing: 0,
				pitch: 0,
				duration: 1500
			});
		}
	}

	function handleLayerToggle(layerDef: ProjectLayerDef, checked: boolean) {
		toggleProjectLayer(layerDef, checked);
		if (checked && layerOpacities[layerDef.id] === undefined) {
			layerOpacities[layerDef.id] = (layerDef.opacity ?? 0.8) * 100;
		}
	}

	function handleOpacityInput(layerDef: ProjectLayerDef, value: number) {
		layerOpacities[layerDef.id] = value;
		updateProjectLayerOpacity(layerDef.id, value / 100);
	}

	function isLayerEnabled(layerId: string, enabled: Set<string>): boolean {
		return enabled.has(layerId);
	}

	function getOpacity(layerId: string, defaultOpacity: number): number {
		return layerOpacities[layerId] ?? defaultOpacity * 100;
	}

	// Count enabled layers for the 3D stack preview
	function getEnabledLayers(
		location: { layers: ProjectLayerDef[] } | null,
		enabled: Set<string>
	): ProjectLayerDef[] {
		if (!location) return [];
		return location.layers.filter((l) => enabled.has(l.id));
	}

	// Get raster store data for a project layer (for legend min/max)
	function getRasterData(layerId: string): { min: number; max: number } {
		const raster = $rasterLayers.get(`project-${layerId}`);
		if (raster?.rescale) {
			return { min: raster.rescale[0], max: raster.rescale[1] };
		}
		return { min: 0, max: 1 };
	}

	// Colors for the 3D stack visualization
	const stackColors: Record<string, string> = {
		rgb: '#6366f1',
		infrared: '#ef4444',
		multispectral: '#22c55e',
		lidar: '#eab308',
		atmospheric: '#3b82f6',
		'ml-prediction': '#a855f7'
	};
</script>

<div
	id="locations-sidebar"
	class="absolute left-4 top-20 z-10 max-h-[calc(100vh-120px)] overflow-hidden rounded-lg border border-base-300/50 bg-base-100/90 shadow-lg backdrop-blur-md transition-all duration-300"
	class:w-10={collapsed}
	class:w-80={!collapsed}
>
	<!-- Header -->
	<div class="flex items-center justify-between border-b border-base-300/50 bg-base-200/50 px-3 py-2.5">
		{#if !collapsed}
			{#if $selectedLocation}
				<button
					class="btn btn-ghost btn-xs gap-1"
					onclick={handleBackClick}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
					Back
				</button>
				<span class="text-sm font-semibold truncate ml-1">{$selectedLocation.name}</span>
			{:else}
				<h3 class="text-sm font-semibold">Locations</h3>
			{/if}
		{/if}
		<div class="ml-auto flex items-center gap-0.5">
			{#if !collapsed}
				<button
					class="btn btn-ghost btn-xs btn-square"
					title="Settings"
					onclick={() => (showSettingsModal = true)}
				>
					<MaterialSymbolsSettingsOutlineRounded />
				</button>
			{/if}
			<button
				class="btn btn-ghost btn-xs btn-square"
				title={collapsed ? 'Expand' : 'Collapse'}
				onclick={() => (collapsed = !collapsed)}
			>
				<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
					{#if collapsed}
						<polyline points="9 18 15 12 9 6"></polyline>
					{:else}
						<polyline points="15 18 9 12 15 6"></polyline>
					{/if}
				</svg>
			</button>
		</div>
	</div>

	{#if !collapsed}
		<div class="overflow-y-auto p-2" style="max-height: calc(100vh - 180px);">
			{#if !$selectedLocation}
				<!-- Location List -->
				<ul class="flex flex-col gap-1.5">
					{#each $projectLocations as location (location.id)}
						<li>
							<button
								id="location-{location.id}"
								class="group flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors hover:bg-base-200/80"
								onclick={() => handleLocationClick(location.id)}
							>
								<div class="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
									<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
								</div>
								<div class="min-w-0 flex-1">
									<div class="text-sm font-medium group-hover:text-primary">{location.name}</div>
									<div class="mt-0.5 text-xs text-base-content/50 line-clamp-2">{location.description}</div>
									<div class="mt-1 flex flex-wrap gap-1">
										{#each location.layers as layer (layer.id)}
											<span class="badge badge-xs {getLayerTypeColor(layer.type)}">{layer.type}</span>
										{/each}
									</div>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<!-- Selected Location: 3D Stack Preview + Layer Controls -->
				<div class="flex flex-col gap-2">
					<p class="px-1 pb-1 text-xs text-base-content/50">{$selectedLocation.description}</p>

					<!-- 3D Layer Stack Preview -->
					{#if getEnabledLayers($selectedLocation, $enabledProjectLayers).length > 0}
						<div class="layer-stack-container relative mx-auto mb-2" id="layer-stack-preview">
							<div class="layer-stack">
								{#each getEnabledLayers($selectedLocation, $enabledProjectLayers) as layer, i (layer.id)}
									{@const opacity = getOpacity(layer.id, layer.opacity ?? 0.8)}
									<div
										class="layer-card"
										style="
											--index: {i};
											--total: {getEnabledLayers($selectedLocation, $enabledProjectLayers).length};
											--color: {stackColors[layer.type] || '#6366f1'};
											--layer-opacity: {opacity / 100};
										"
									>
										<span class="layer-card-label">{layer.name}</span>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<div class="divider my-0 text-xs">Layers</div>

					{#each $selectedLocation.layers as layer (layer.id)}
						{@const enabled = isLayerEnabled(layer.id, $enabledProjectLayers)}
						{@const opacity = getOpacity(layer.id, layer.opacity ?? 0.8)}
						<div
							id="layer-control-{layer.id}"
							class="rounded px-2 py-1 transition-colors {enabled ? 'bg-base-200/40' : ''}"
						>
							<!-- Toggle + name + opacity slider all in one row -->
							<label class="flex cursor-pointer items-center gap-2">
								<input
									type="checkbox"
									class="checkbox checkbox-xs checkbox-primary"
									checked={enabled}
									onchange={(e) => handleLayerToggle(layer, e.currentTarget.checked)}
								/>
								<span
									class="h-2 w-2 shrink-0 rounded-full"
									style="background-color: {stackColors[layer.type] || '#6366f1'}"
								></span>
								<span class="flex-1 text-xs" class:font-medium={enabled}>{layer.name}</span>
							</label>

							{#if enabled}
								<!-- Compact opacity slider -->
								<div class="mt-1 flex items-center gap-1.5 pl-6">
									<input
										type="range"
										min="0"
										max="100"
										value={opacity}
										oninput={(e) => handleOpacityInput(layer, parseInt(e.currentTarget.value))}
										class="layer-slider flex-1"
									/>
									<span class="w-7 text-right text-[10px] tabular-nums text-base-content/40">{Math.round(opacity)}%</span>
								</div>

								<!-- Compact inline legend -->
								{@const info = getLegendInfo(layer.name, `project-${layer.id}`)}
								{@const rd = getRasterData(layer.id)}
								{@const ticks = computeTicks(rd.min, rd.max, 3)}
								<div class="mt-0.5 pl-6 pr-1">
									<div
										class="h-1.5 w-full rounded-sm"
										style="background: {getGradientStyle(layer.colormap ?? 'viridis')}"
									></div>
									<div class="flex w-full justify-between">
										{#each ticks as tick}
											<span class="text-[8px] tabular-nums text-base-content/35">
												{formatTickValue(tick, rd.min, rd.max, info.unit)}
											</span>
										{/each}
									</div>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Settings Modal -->
{#if showSettingsModal}
	<div class="modal modal-open">
		<div class="modal-box">
			<h3 class="mb-4 text-lg font-bold">Visualization Settings</h3>

			<!-- Raster Debug Overlay -->
			<div class="form-control mb-4 w-full">
				<label class="label cursor-pointer">
					<span class="label-text font-medium">Show raster data pixels (debug)</span>
					<input
						type="checkbox"
						class="toggle"
						bind:checked={showRasterDataOverlayLocal}
						onchange={() => {
							saveSettingsToStorage({ showRasterDataOverlay: showRasterDataOverlayLocal });
							dispatch('overlaytoggle', { visible: showRasterDataOverlayLocal });
						}}
					/>
				</label>
				<p class="text-base-content/60 mt-1 text-xs">
					Renders small red dots over each pixel with data to verify alignment.
				</p>
			</div>

			<!-- Global Raster Opacity Control -->
			<div class="form-control mb-4 w-full">
				<label for="raster-opacity" class="label">
					<span class="label-text font-medium">Global Raster Opacity</span>
					<span class="label-text-alt font-bold">{globalOpacity}%</span>
				</label>
				<div class="relative">
					<input
						id="raster-opacity"
						type="range"
						min="0"
						max="100"
						bind:value={globalOpacity}
						oninput={() => {
							updateAllRasterLayersOpacity(globalOpacity / 100);
							saveSettingsToStorage({ globalOpacity });
							dispatch('opacitychange', { opacity: globalOpacity });
						}}
						class="range range-primary"
					/>
					<div class="mt-1 flex w-full justify-between px-2 text-xs">
						<span>0%</span>
						<span>100%</span>
					</div>
				</div>
				<p class="text-base-content/70 mt-2 text-sm">
					Controls the transparency of all raster layers on the map.
				</p>
			</div>

			<div class="modal-action">
				<button class="btn btn-primary" onclick={() => (showSettingsModal = false)}>Done</button>
			</div>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => (showSettingsModal = false)}></div>
	</div>
{/if}

<style>
	.layer-stack-container {
		width: 180px;
		height: 100px;
		perspective: 600px;
	}

	.layer-stack {
		width: 100%;
		height: 100%;
		position: relative;
		transform-style: preserve-3d;
		transform: rotateX(50deg) rotateZ(-20deg);
	}

	.layer-card {
		position: absolute;
		width: 120px;
		height: 75px;
		left: 50%;
		top: 50%;
		border-radius: 4px;
		border: 1.5px solid var(--color);
		background: color-mix(in srgb, var(--color) 25%, transparent);
		opacity: var(--layer-opacity);
		transform:
			translate(-50%, -50%)
			translateZ(calc(var(--index) * 22px));
		box-shadow:
			0 2px 8px rgba(0, 0, 0, 0.1),
			inset 0 0 20px color-mix(in srgb, var(--color) 10%, transparent);
		transition: opacity 0.2s ease, transform 0.3s ease;
		display: flex;
		align-items: flex-end;
		justify-content: flex-start;
		padding: 4px 6px;
	}

	.layer-card-label {
		font-size: 9px;
		font-weight: 600;
		color: var(--color);
		text-shadow: 0 0 4px rgba(255, 255, 255, 0.8);
		white-space: nowrap;
	}

	/* Thin, subtle opacity slider */
	.layer-slider {
		-webkit-appearance: none;
		appearance: none;
		height: 3px;
		background: oklch(var(--bc) / 0.15);
		border-radius: 2px;
		outline: none;
	}

	.layer-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: oklch(var(--p));
		cursor: pointer;
	}

	.layer-slider::-moz-range-thumb {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: oklch(var(--p));
		border: none;
		cursor: pointer;
	}
</style>
