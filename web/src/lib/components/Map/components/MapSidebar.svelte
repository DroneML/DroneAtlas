<script lang="ts">
	import {
		updateAllRasterLayersOpacity
	} from '../store';
	import { onMount, createEventDispatcher } from 'svelte';
	import MaterialSymbolsSettingsOutlineRounded from '~icons/material-symbols/settings-outline-rounded';

	const dispatch = createEventDispatcher();

	// Import localStorage utilities for settings persistence
	import {
		loadStoredSettings,
		saveSettingsToStorage
	} from '$lib/stores/visualizationSettings/localStorage';

	let className: string | undefined = undefined;
	export { className as class };

	// --- Raster Layer State ---
	export let globalOpacity = 80; // Default to 80%, now exposed as a prop
	let rasterLayersVisible = true;
	let showRasterDataOverlayLocal = false;

	// Sidebar configuration
	let collapsed = false;
	let showSettingsModal = false;

	// Initialize on mount
	onMount(() => {
		// Load stored settings from localStorage
		const storedSettings = loadStoredSettings();

		// Use stored opacity
		globalOpacity = storedSettings.globalOpacity;

		// Apply the opacity to all raster layers
		updateAllRasterLayersOpacity(globalOpacity / 100);

		// Set initial checkbox state based on opacity
		rasterLayersVisible = globalOpacity > 0;

		// Initialize debug overlay toggle from stored setting
		showRasterDataOverlayLocal = storedSettings.showRasterDataOverlay;
		dispatch('overlaytoggle', { visible: showRasterDataOverlayLocal });
	});
</script>

<div
	id="map-sidebar"
	class={'grid max-h-[calc(100%-20px)] overflow-visible rounded-lg border border-white/30 bg-gradient-to-r from-white/80 to-white/70 backdrop-blur-md backdrop-filter transition-all duration-300 sm:shadow-lg ' +
		className}
>
	<!-- Sidebar header with toggle button -->
	<div class="z-10 border-b border-white/30 bg-gradient-to-r from-white/40 to-white/20 p-4">
		<div class="hidden w-full items-center justify-between sm:flex">
			<div class="flex flex-col">
				<h2 class="text-base-content text-md m-0 font-semibold">Data Explorer</h2>
			</div>
			<div class="flex items-center gap-1">
				<!-- Settings button -->
				<button
					class="btn btn-sm btn-ghost btn-square"
					title="Visualization Settings"
					onclick={() => (showSettingsModal = true)}
				>
					<MaterialSymbolsSettingsOutlineRounded />
				</button>
				<!-- Collapse button -->
				<button
					class="btn btn-sm btn-ghost btn-square"
					title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
					onclick={() => (collapsed = !collapsed)}
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="16"
						height="16"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						class="h-5 w-5"
					>
						{#if collapsed}
							<polyline points="9 18 15 12 9 6"></polyline>
						{:else}
							<polyline points="6 9 12 15 18 9"></polyline>
						{/if}
					</svg>
				</button>
			</div>
		</div>
	</div>

	{#if !collapsed}
		<!-- Content -->
		<div
			class="flex h-full max-h-[calc(100vh-250px)] w-full flex-col space-y-4 overflow-y-auto p-1 pt-3 sm:max-h-[calc(100vh-250px)] sm:w-80 sm:p-4"
			style="overflow-x: visible;"
		>
			<p class="text-base-content/60 text-sm italic">
				No data layers loaded. Use the settings to configure raster layer opacity.
			</p>
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
							rasterLayersVisible = globalOpacity > 0;
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
				<div class="mt-2">
					<p class="text-base-content/70 text-sm">
						Controls the transparency of all raster layers on the map.
					</p>
					<p class="text-base-content/60 mt-1 text-xs">
						0% = Completely transparent (invisible)
						<br />
						100% = Completely opaque
						<br />
						Applies to all active raster layers simultaneously
					</p>
				</div>
			</div>

			<div class="modal-action">
				<button class="btn btn-primary" onclick={() => (showSettingsModal = false)}>Done</button>
			</div>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => (showSettingsModal = false)}></div>
	</div>
{/if}
