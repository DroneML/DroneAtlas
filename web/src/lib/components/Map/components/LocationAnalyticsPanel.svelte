<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import type { ProjectLayerDef } from '$lib/types';
	import {
		selectedLocation,
		enabledProjectLayers,
		toggleProjectLayer,
		updateProjectLayerOpacity
	} from '$lib/stores/projects.store';
	import { rasterLayers } from '$lib/stores/raster.store';

	export let siteModelVisible = true;
	export let siteModelOpacity = 100;

	const dispatch = createEventDispatcher<{
		sitemodeltoggle: { visible: boolean };
		sitemodelopacity: { opacity: number };
	}>();

	const layerColors: Record<ProjectLayerDef['type'], string> = {
		rgb: '#62a7ff',
		infrared: '#ff8a45',
		multispectral: '#67e985',
		lidar: '#ffd166',
		atmospheric: '#51d6ff',
		'ml-prediction': '#c084fc'
	};

	let visibleLayers: ProjectLayerDef[] = [];
	let visibleLayerIds = new Set<string>();
	let layerChecked: Record<string, boolean> = {};
	let activeLayerCount = 0;

	$: visibleLayers =
		$selectedLocation?.layers.filter(
			(layer) =>
				$enabledProjectLayers.has(layer.id) || Boolean($rasterLayers.get(`project-${layer.id}`)?.isVisible)
		) ?? [];
	$: visibleLayerIds = new Set(visibleLayers.map((layer) => layer.id));
	$: layerChecked = Object.fromEntries(($selectedLocation?.layers ?? []).map((layer) => [layer.id, visibleLayerIds.has(layer.id)]));
	$: activeLayerCount = visibleLayers.length + (siteModelVisible ? 1 : 0);

	function isLayerEnabled(layerId: string): boolean {
		return layerChecked[layerId] ?? false;
	}

	function getLayerColor(type: ProjectLayerDef['type']): string {
		return layerColors[type] ?? '#62a7ff';
	}

	function getOpacity(layer: ProjectLayerDef): number {
		const rasterLayer = $rasterLayers.get(`project-${layer.id}`);
		return Math.round((rasterLayer?.opacity ?? layer.opacity ?? 0.8) * 100);
	}

	function handleLayerToggle(layer: ProjectLayerDef, checked: boolean) {
		toggleProjectLayer(layer, checked);
	}

	function handleSiteModelToggle(checked: boolean) {
		dispatch('sitemodeltoggle', { visible: checked });
	}

	function handleSiteModelOpacityInput(value: number) {
		if (!siteModelVisible) dispatch('sitemodeltoggle', { visible: true });
		dispatch('sitemodelopacity', { opacity: value });
	}

	function handleOpacityInput(layer: ProjectLayerDef, value: number) {
		if (!isLayerEnabled(layer.id)) toggleProjectLayer(layer, true);
		updateProjectLayerOpacity(layer.id, value / 100);
	}

</script>

{#if $selectedLocation}
	<aside class="analytics-panel" aria-label="Location analytics">
		<section class="panel-card layer-card">
			<div class="card-title">
				<span>Layer Transparency</span>
				<small>{activeLayerCount} active</small>
			</div>
			<div class="layer-list">
				{#if $selectedLocation.id === 'weesp-castle'}
					<div class="layer-row enabled reconstruction-row">
						<label>
							{#key siteModelVisible}
								<input
									type="checkbox"
									checked={siteModelVisible}
									onchange={(event) => handleSiteModelToggle(event.currentTarget.checked)}
								/>
							{/key}
							<span class="swatch reconstruction-swatch"></span>
							<span class="layer-name">3D reconstruction</span>
							<span class="layer-value">{siteModelOpacity}%</span>
						</label>
						<input
							class="opacity-slider"
							type="range"
							min="0"
							max="100"
							value={siteModelOpacity}
							aria-label="3D reconstruction transparency"
							oninput={(event) => handleSiteModelOpacityInput(Number(event.currentTarget.value))}
						/>
						<div class="model-location-hint">Centered on the suspected tower and wall footprint.</div>
					</div>
				{/if}
				{#each $selectedLocation.layers as layer (layer.id)}
					{@const enabled = layerChecked[layer.id] ?? false}
					{@const opacity = getOpacity(layer)}
					<div class="layer-row" class:enabled>
						<label>
							{#key `${layer.id}-${enabled}`}
								<input
									type="checkbox"
									checked={enabled}
									onchange={(event) => handleLayerToggle(layer, event.currentTarget.checked)}
								/>
							{/key}
							<span class="swatch" style="background: {getLayerColor(layer.type)}"></span>
							<span class="layer-name">{layer.name}</span>
							<span class="layer-value">{opacity}%</span>
						</label>
						<input
							class="opacity-slider"
							type="range"
							min="0"
						max="100"
						value={opacity}
						aria-label="{layer.name} transparency"
						oninput={(event) => handleOpacityInput(layer, Number(event.currentTarget.value))}
						/>
					</div>
				{/each}
			</div>
		</section>

		<section class="panel-card stack-card">
			<div class="card-title">
				<span>Evidence Stack</span>
				<small>{visibleLayers.length} layers</small>
			</div>
			<div class="stack-stage">
				{#each visibleLayers as layer, i (layer.id)}
					<div
						class="stack-plane"
						style="--i: {i}; --plane-color: {getLayerColor(layer.type)}; --total: {visibleLayers.length}"
					>
						<span>{layer.name}</span>
					</div>
				{/each}
				{#if visibleLayers.length === 0}
					<div class="stack-empty">Enable layers to build the stack</div>
				{/if}
			</div>
		</section>
	</aside>
{/if}

<style>
	.analytics-panel {
		position: absolute;
		right: 16px;
		top: 84px;
		bottom: 16px;
		z-index: 38;
		width: min(360px, calc(100vw - 32px));
		display: flex;
		flex-direction: column;
		gap: 10px;
		overflow-y: auto;
		padding: 12px;
		color: #e8f1ff;
		background:
			radial-gradient(circle at 15% 0%, rgba(57, 210, 255, 0.12), transparent 32%),
			linear-gradient(180deg, rgba(17, 24, 37, 0.9), rgba(7, 11, 18, 0.86));
		border: 1px solid rgba(160, 190, 220, 0.16);
		border-radius: 22px;
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.42), inset 0 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(20px) saturate(140%);
	}

	.card-title small {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(129, 220, 255, 0.76);
	}

	.panel-card {
		position: relative;
		overflow: hidden;
		padding: 12px;
		border: 1px solid rgba(160, 190, 220, 0.12);
		border-radius: 16px;
		background: rgba(10, 16, 26, 0.62);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
	}

	.card-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 10px;
		font-size: 13px;
		font-weight: 800;
	}

	.layer-list {
		display: grid;
		gap: 7px;
	}

	.layer-row {
		padding: 9px;
		border: 1px solid rgba(255, 255, 255, 0.07);
		border-radius: 12px;
		background: rgba(255, 255, 255, 0.035);
		transition: border-color 0.18s ease, background 0.18s ease;
	}

	.layer-row.enabled {
		border-color: rgba(129, 220, 255, 0.22);
		background: rgba(57, 210, 255, 0.065);
	}

	.reconstruction-row {
		border-color: rgba(255, 45, 168, 0.34);
		background:
			radial-gradient(circle at 12% 50%, rgba(255, 45, 168, 0.18), transparent 34%),
			rgba(57, 210, 255, 0.055);
	}

	.layer-row label {
		display: grid;
		grid-template-columns: auto auto minmax(0, 1fr) auto;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.layer-row input[type='checkbox'] {
		accent-color: #61d8ff;
	}

	.swatch {
		width: 10px;
		height: 10px;
		border-radius: 3px;
		box-shadow: 0 0 14px currentColor;
	}

	.reconstruction-swatch {
		background: linear-gradient(135deg, #ff2da8, #39d2ff 55%, #fff454);
		box-shadow:
			0 0 14px rgba(255, 45, 168, 0.75),
			0 0 22px rgba(57, 210, 255, 0.42);
	}

	.model-location-hint {
		margin-top: 6px;
		padding-left: 34px;
		font-size: 9px;
		line-height: 1.35;
		color: rgba(232, 241, 255, 0.48);
	}

	.layer-name {
		overflow: hidden;
		font-size: 12px;
		font-weight: 700;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.layer-value {
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		color: rgba(232, 241, 255, 0.5);
	}

	.opacity-slider {
		width: 100%;
		margin-top: 8px;
		accent-color: #61d8ff;
	}

	.stack-stage {
		position: relative;
		height: 130px;
		perspective: 740px;
	}

	.stack-plane {
		position: absolute;
		left: 50%;
		top: 50%;
		width: 180px;
		height: 88px;
		padding: 8px;
		border: 1px solid color-mix(in srgb, var(--plane-color) 74%, transparent);
		border-radius: 10px;
		background:
			linear-gradient(135deg, color-mix(in srgb, var(--plane-color) 30%, transparent), rgba(255, 255, 255, 0.02)),
			repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.04) 0 2px, transparent 2px 7px);
		box-shadow: 0 18px 34px rgba(0, 0, 0, 0.28), 0 0 24px color-mix(in srgb, var(--plane-color) 28%, transparent);
		transform: translate(-50%, -50%) rotateX(58deg) rotateZ(-24deg) translateZ(calc(var(--i) * 18px));
		transform-style: preserve-3d;
	}

	.stack-plane span {
		font-size: 9px;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: color-mix(in srgb, var(--plane-color) 70%, white);
		text-shadow: 0 1px 12px rgba(0, 0, 0, 0.9);
	}

	.stack-empty {
		display: grid;
		place-items: center;
		height: 100%;
		font-size: 12px;
		color: rgba(232, 241, 255, 0.48);
	}

	@media (max-width: 1023px) {
		.analytics-panel {
			left: 12px;
			right: 12px;
			top: auto;
			bottom: 12px;
			width: auto;
			max-height: 44vh;
			border-radius: 18px;
		}

		.stack-card {
			display: none;
		}
	}
</style>
