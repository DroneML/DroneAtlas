<script lang="ts">
	import { createEventDispatcher, onMount } from 'svelte';
	import type { Map as MaplibreMap } from 'maplibre-gl';
	import type { ProjectLayerDef } from '$lib/types';
	import {
		projectLocations,
		selectedLocation,
		selectLocation,
		toggleProjectLayer,
		updateProjectLayerOpacity
	} from '$lib/stores/projects.store';
	import { updateAllRasterLayersOpacity } from '$lib/stores/raster.store';
	import {
		loadStoredSettings,
		saveSettingsToStorage
	} from '$lib/stores/visualizationSettings/localStorage';
	import MaterialSymbolsSettingsOutlineRounded from '~icons/material-symbols/settings-outline-rounded';

	export let map: MaplibreMap | null = null;
	export let globalOpacity: number = 80;
	export let disableFloatingDrone: boolean = false;

	let collapsed = false;
	let showSettingsModal = false;
	let showRasterDataOverlayLocal = false;

	const dispatch = createEventDispatcher();

	const layerColors: Record<ProjectLayerDef['type'], string> = {
		rgb: '#62a7ff',
		infrared: '#ff8a45',
		multispectral: '#67e985',
		lidar: '#ffd166',
		atmospheric: '#51d6ff',
		'ml-prediction': '#c084fc'
	};

	const weespShowcaseLayers = new Set([
		'weesp-rgb',
		'weesp-lidar',
		'weesp-multispectral',
		'weesp-thermal',
		'weesp-probability'
	]);
	const weespShowcaseOpacity: Record<string, number> = {
		'weesp-rgb': 0.86,
		'weesp-lidar': 0.56,
		'weesp-multispectral': 0.38,
		'weesp-thermal': 0.42,
		'weesp-probability': 0.62
	};

	onMount(() => {
		const storedSettings = loadStoredSettings();
		globalOpacity = storedSettings.globalOpacity;
		updateAllRasterLayersOpacity(globalOpacity / 100);
		showRasterDataOverlayLocal = storedSettings.showRasterDataOverlay;
		disableFloatingDrone = storedSettings.disableFloatingDrone;
		dispatch('overlaytoggle', { visible: showRasterDataOverlayLocal });
		dispatch('floatingdronetoggle', { disabled: disableFloatingDrone });
	});

	function handleLocationClick(locationId: string) {
		const location = $projectLocations.find((item) => item.id === locationId);
		if (!location) return;
		if (location.id === 'weesp-castle') {
			dispatch('weespdemostart', { locationId: location.id });
			return;
		}

		selectLocation(locationId);

		for (const layer of location.layers) {
			const showcaseEnabled = location.id === 'weesp-castle' && weespShowcaseLayers.has(layer.id);
			const shouldEnable = location.id === 'weesp-castle' ? showcaseEnabled : layer.defaultEnabled;
			if (shouldEnable) {
				toggleProjectLayer(layer, true);
				updateProjectLayerOpacity(layer.id, weespShowcaseOpacity[layer.id] ?? (layer.opacity ?? 0.48));
			}
		}

		if (map) {
			const duration = 2000;
			dispatch('flightstart', { duration, target: 'location' });
			map.flyTo({
				center: location.center,
				zoom: location.zoom,
				bearing: location.bearing ?? 0,
				pitch: location.pitch ?? 0,
				duration
			});
		}
	}

	function handleBackClick() {
		selectLocation(null);

		if (map) {
			const duration = 1500;
			dispatch('flightstart', { duration, target: 'overview' });
			map.flyTo({
				center: [5.5, 52.0],
				zoom: 7,
				bearing: 0,
				pitch: 0,
				duration
			});
		}
	}

	function formatLayerType(type: ProjectLayerDef['type']): string {
		return type.replace('-', ' ');
	}

	function getLayerColor(type: ProjectLayerDef['type']): string {
		return layerColors[type] ?? '#62a7ff';
	}
</script>

<div id="locations-sidebar" class="locations-panel" class:collapsed>
	<div class="panel-topline"></div>
	<header class="locations-header">
		{#if !collapsed}
			<div class="header-copy">
				<div class="eyebrow">DroneATLAS</div>
				{#if $selectedLocation}
					<h2>{$selectedLocation.name}</h2>
				{:else}
					<h2>Case Locations</h2>
				{/if}
			</div>
		{/if}
		<div class="header-actions">
			{#if !collapsed}
				<button class="icon-button" type="button" title="Settings" onclick={() => (showSettingsModal = true)}>
					<MaterialSymbolsSettingsOutlineRounded />
				</button>
			{/if}
			<button
				class="icon-button"
				type="button"
				title={collapsed ? 'Expand locations' : 'Collapse locations'}
				onclick={() => (collapsed = !collapsed)}
			>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					{#if collapsed}
						<path d="m9 18 6-6-6-6" />
					{:else}
						<path d="m15 18-6-6 6-6" />
					{/if}
				</svg>
			</button>
		</div>
	</header>

	{#if !collapsed}
		<div class="locations-content">
			{#if !$selectedLocation}
				<section class="mission-card">
					<div class="mission-kicker">Primary Demo Route</div>
					<h3>In search of a castle</h3>
					<p>
						Enter Weesp to reveal RGB, LiDAR, multispectral, thermal, and anomaly probability layers on the map.
					</p>
				</section>

				<ul class="location-list" aria-label="Project locations">
					{#each $projectLocations as location (location.id)}
						<li>
							<button
								id="location-{location.id}"
								class="location-button"
								class:featured={Boolean(location.caseStudy)}
								type="button"
								onclick={() => handleLocationClick(location.id)}
							>
								<div class="location-marker">
									<svg viewBox="0 0 24 24" aria-hidden="true">
										<path d="M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5Z" />
									</svg>
								</div>
								<div class="location-copy">
									<div class="location-title-row">
										<strong>{location.name}</strong>
										{#if location.caseStudy}<span>paper</span>{/if}
									</div>
									{#if location.subtitle}
										<small>{location.subtitle}</small>
									{/if}
									<p>{location.description}</p>
									<div class="layer-dot-row" aria-label="Available layers">
										{#each location.layers as layer (layer.id)}
											<span
											title={formatLayerType(layer.type)}
											style="background: {getLayerColor(layer.type)}"
										></span>
										{/each}
									</div>
								</div>
							</button>
						</li>
					{/each}
				</ul>
			{:else}
				<button class="back-button" type="button" onclick={handleBackClick}>
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6" /></svg>
					Back to overview
				</button>

				<section class="case-card">
					<div class="mission-kicker">{$selectedLocation.caseStudy ?? 'Selected location'}</div>
					<h3>{$selectedLocation.subtitle ?? $selectedLocation.name}</h3>
					<p>{$selectedLocation.description}</p>
					{#if $selectedLocation.period}
						<div class="period-pill">{$selectedLocation.period}</div>
					{/if}
				</section>

				{#if $selectedLocation.facts}
					<section class="fact-grid" aria-label="Location facts">
						{#each $selectedLocation.facts as fact}
							<div>
								<span>{fact.label}</span>
								<strong>{fact.value}</strong>
							</div>
						{/each}
					</section>
				{/if}

				{#if $selectedLocation.workflow}
					<section class="workflow-card">
						<div class="section-title">Evidence Workflow</div>
						{#each $selectedLocation.workflow as step}
							<div class="workflow-step">
								<strong>{step.title}</strong>
								<span>{step.description}</span>
							</div>
						{/each}
					</section>
				{/if}

				{#if $selectedLocation.findings}
					<section class="findings-card">
						<div class="section-title">Interpretation Targets</div>
						<div>
							{#each $selectedLocation.findings as finding}
								<span>{finding}</span>
							{/each}
						</div>
					</section>
				{/if}

				<section class="active-layer-card">
					<div class="section-title">Evidence Layers</div>
					<div class="active-layer-list">
						{#each $selectedLocation.layers as layer (layer.id)}
							<div>
								<span class="layer-dot" style="background: {getLayerColor(layer.type)}"></span>
								<span>{layer.name}</span>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		</div>
	{/if}
</div>

{#if showSettingsModal}
	<div class="modal modal-open">
		<div class="modal-box settings-modal">
			<h3>Visualization Settings</h3>

			<div class="form-control mb-4 w-full">
				<label class="label cursor-pointer">
					<span class="label-text font-medium">Disable floating drone</span>
					<input
						type="checkbox"
						class="toggle"
						bind:checked={disableFloatingDrone}
						onchange={() => {
							saveSettingsToStorage({ disableFloatingDrone });
							dispatch('floatingdronetoggle', { disabled: disableFloatingDrone });
						}}
					/>
				</label>
				<p class="text-sm text-white/50">Hides the decorative drone overlay during map navigation.</p>
			</div>

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
				<p class="text-sm text-white/50">Renders data pixels for alignment checks.</p>
			</div>

			<div class="form-control mb-4 w-full">
				<label for="raster-opacity" class="label">
					<span class="label-text font-medium">Global Raster Opacity</span>
					<span class="label-text-alt font-bold">{globalOpacity}%</span>
				</label>
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
			</div>

			<div class="modal-action">
				<button class="btn btn-primary" type="button" onclick={() => (showSettingsModal = false)}>Done</button>
			</div>
		</div>
		<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
		<div class="modal-backdrop" onclick={() => (showSettingsModal = false)}></div>
	</div>
{/if}

<style>
	.locations-panel {
		position: absolute;
		left: 76px;
		top: 84px;
		z-index: 36;
		width: 342px;
		max-height: calc(100vh - 104px);
		overflow: hidden;
		color: #e8f1ff;
		background:
			radial-gradient(circle at 0% 0%, rgba(97, 216, 255, 0.11), transparent 36%),
			linear-gradient(180deg, rgba(16, 23, 35, 0.88), rgba(7, 11, 18, 0.82));
		border: 1px solid rgba(167, 213, 255, 0.14);
		border-radius: 22px;
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(20px) saturate(140%);
		transition: width 0.22s ease, transform 0.22s ease;
	}

	.locations-panel.collapsed {
		width: 48px;
	}

	.panel-topline {
		height: 2px;
		background: linear-gradient(90deg, #61d8ff, #67e985, #ff9b54);
		opacity: 0.78;
	}

	.locations-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		padding: 12px;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
	}

	.header-copy {
		min-width: 0;
	}

	.eyebrow,
	.mission-kicker,
	.section-title {
		font-size: 10px;
		font-weight: 800;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(97, 216, 255, 0.76);
	}

	h2,
	h3,
	p {
		margin: 0;
	}

	h2 {
		overflow: hidden;
		margin-top: 3px;
		font-size: 16px;
		font-weight: 800;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	h3 {
		margin-top: 5px;
		font-size: 18px;
		line-height: 1.12;
		font-weight: 800;
		letter-spacing: -0.03em;
	}

	p {
		margin-top: 8px;
		font-size: 12px;
		line-height: 1.45;
		color: rgba(232, 241, 255, 0.62);
	}

	.header-actions {
		display: flex;
		gap: 6px;
		margin-left: auto;
	}

	.icon-button,
	.back-button {
		border: 1px solid rgba(167, 213, 255, 0.14);
		background: rgba(255, 255, 255, 0.05);
		color: rgba(232, 241, 255, 0.84);
		transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
	}

	.icon-button {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 10px;
	}

	.icon-button:hover,
	.back-button:hover {
		transform: translateY(-1px);
		border-color: rgba(97, 216, 255, 0.4);
		background: rgba(97, 216, 255, 0.1);
	}

	svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-width: 2;
		stroke-linecap: round;
		stroke-linejoin: round;
	}

	.location-marker svg {
		fill: currentColor;
		stroke: none;
	}

	.locations-content {
		max-height: calc(100vh - 170px);
		overflow-y: auto;
		padding: 12px;
	}

	.mission-card,
	.case-card,
	.workflow-card,
	.findings-card,
	.active-layer-card {
		border: 1px solid rgba(167, 213, 255, 0.12);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.045);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	.mission-card,
	.case-card {
		padding: 14px;
	}

	.mission-card {
		margin-bottom: 10px;
		background:
			radial-gradient(circle at 12% 8%, rgba(255, 155, 84, 0.16), transparent 36%),
			linear-gradient(135deg, rgba(97, 216, 255, 0.1), rgba(255, 255, 255, 0.035));
	}

	.location-list {
		display: grid;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.location-button {
		display: grid;
		width: 100%;
		grid-template-columns: auto minmax(0, 1fr);
		gap: 10px;
		padding: 11px;
		border: 1px solid rgba(255, 255, 255, 0.075);
		border-radius: 16px;
		background: rgba(255, 255, 255, 0.04);
		text-align: left;
		color: inherit;
		transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
	}

	.location-button:hover,
	.location-button.featured {
		border-color: rgba(97, 216, 255, 0.3);
		background: rgba(97, 216, 255, 0.08);
	}

	.location-button:hover {
		transform: translateY(-1px);
	}

	.location-marker {
		display: grid;
		place-items: center;
		width: 30px;
		height: 30px;
		border-radius: 10px;
		background: rgba(97, 216, 255, 0.11);
		color: #61d8ff;
		box-shadow: 0 0 22px rgba(97, 216, 255, 0.15);
	}

	.location-marker svg {
		width: 15px;
		height: 15px;
	}

	.location-copy {
		min-width: 0;
	}

	.location-title-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.location-title-row strong {
		overflow: hidden;
		font-size: 13px;
		font-weight: 800;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.location-title-row span {
		padding: 2px 6px;
		border-radius: 999px;
		background: rgba(255, 155, 84, 0.16);
		font-size: 9px;
		font-weight: 900;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: #ffc48d;
	}

	.location-copy small {
		display: block;
		margin-top: 2px;
		font-size: 11px;
		font-weight: 700;
		color: rgba(232, 241, 255, 0.55);
	}

	.location-copy p {
		display: -webkit-box;
		overflow: hidden;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		font-size: 11px;
	}

	.layer-dot-row {
		display: flex;
		gap: 5px;
		margin-top: 8px;
	}

	.layer-dot-row span,
	.layer-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		box-shadow: 0 0 12px currentColor;
	}

	.back-button {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 10px;
		padding: 7px 10px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 800;
	}

	.period-pill {
		margin-top: 10px;
		padding: 7px 9px;
		border-radius: 10px;
		background: rgba(97, 216, 255, 0.08);
		font-size: 10px;
		font-weight: 700;
		color: rgba(232, 241, 255, 0.62);
	}

	.fact-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 8px;
		margin-top: 10px;
	}

	.fact-grid div {
		padding: 10px;
		border: 1px solid rgba(255, 255, 255, 0.08);
		border-radius: 14px;
		background: rgba(255, 255, 255, 0.04);
	}

	.fact-grid span,
	.workflow-step span {
		display: block;
		font-size: 10px;
		line-height: 1.35;
		color: rgba(232, 241, 255, 0.52);
	}

	.fact-grid strong {
		display: block;
		margin-top: 2px;
		font-size: 14px;
		font-weight: 850;
	}

	.workflow-card,
	.findings-card,
	.active-layer-card {
		margin-top: 10px;
		padding: 12px;
	}

	.workflow-step {
		margin-top: 8px;
		padding: 8px;
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.04);
	}

	.workflow-step strong {
		display: block;
		margin-bottom: 3px;
		font-size: 11px;
	}

	.findings-card div:last-child {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
		margin-top: 9px;
	}

	.findings-card span {
		padding: 5px 8px;
		border: 1px solid rgba(103, 233, 133, 0.16);
		border-radius: 999px;
		background: rgba(103, 233, 133, 0.07);
		font-size: 10px;
		color: rgba(208, 255, 218, 0.76);
	}

	.active-layer-list {
		display: grid;
		gap: 6px;
		margin-top: 9px;
	}

	.active-layer-list div {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 11px;
		font-weight: 700;
		color: rgba(232, 241, 255, 0.7);
	}

	.settings-modal {
		color: #e8f1ff;
		background: #0b111c;
		border: 1px solid rgba(167, 213, 255, 0.18);
	}

	.settings-modal h3 {
		margin-bottom: 16px;
		font-size: 18px;
		font-weight: 800;
	}

	@media (max-width: 1023px) {
		.locations-panel {
			left: 12px;
			top: 78px;
			width: min(342px, calc(100vw - 72px));
			max-height: 44vh;
		}

		.locations-panel.collapsed {
			width: 48px;
		}

		.locations-content {
			max-height: calc(44vh - 64px);
		}
	}

	@media (max-width: 640px) {
		.locations-panel:not(.collapsed) {
			width: calc(100vw - 24px);
		}
	}
</style>
