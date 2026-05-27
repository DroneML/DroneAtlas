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

	const dispatch = createEventDispatcher<{ sitemodeltoggle: { visible: boolean } }>();

	const layerColors: Record<ProjectLayerDef['type'], string> = {
		rgb: '#62a7ff',
		infrared: '#ff8a45',
		multispectral: '#67e985',
		lidar: '#ffd166',
		atmospheric: '#51d6ff',
		'ml-prediction': '#c084fc'
	};

	const chartMetrics = [
		{ label: 'Prediction peak', value: '99%', trend: 'hover', color: '#c084fc' },
		{ label: 'Vegetation contrast', value: '0.71', trend: '+34%', color: '#67e985' },
		{ label: 'LiDAR relief', value: '0.42 m', trend: '+11%', color: '#ffd166' }
	];

	function isLayerEnabled(layerId: string): boolean {
		return $enabledProjectLayers.has(layerId);
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

	function handleOpacityInput(layer: ProjectLayerDef, value: number) {
		updateProjectLayerOpacity(layer.id, value / 100);
	}

	function enabledLayers(layers: ProjectLayerDef[]): ProjectLayerDef[] {
		return layers.filter((layer) => isLayerEnabled(layer.id));
	}
</script>

{#if $selectedLocation}
	<aside class="analytics-panel" aria-label="Location analytics">
		<div class="panel-header">
			<div>
				<div class="eyebrow">Live Site Analysis</div>
				<h2>{$selectedLocation.name}</h2>
			</div>
			<div class="status-pill"><span></span> demo-ready</div>
		</div>

		<section class="panel-card layer-card">
			<div class="card-title">
				<span>Layer Controls</span>
				<small>{enabledLayers($selectedLocation.layers).length + (siteModelVisible ? 1 : 0)} active</small>
			</div>
			<div class="layer-list">
				{#if $selectedLocation.id === 'weesp-castle'}
					<div class="layer-row enabled reconstruction-row">
						<label>
							<input
								type="checkbox"
								checked={siteModelVisible}
								onchange={(event) => handleSiteModelToggle(event.currentTarget.checked)}
							/>
							<span class="swatch reconstruction-swatch"></span>
							<span class="layer-name">3D reconstruction</span>
							<span class="layer-value">castle</span>
						</label>
						<div class="model-location-hint">Centered on the suspected tower and wall footprint.</div>
					</div>
				{/if}
				{#each $selectedLocation.layers as layer (layer.id)}
					{@const enabled = isLayerEnabled(layer.id)}
					{@const opacity = getOpacity(layer)}
					<div class="layer-row" class:enabled>
						<label>
							<input
								type="checkbox"
								checked={enabled}
								onchange={(event) => handleLayerToggle(layer, event.currentTarget.checked)}
							/>
							<span class="swatch" style="background: {getLayerColor(layer.type)}"></span>
							<span class="layer-name">{layer.name}</span>
							<span class="layer-value">{opacity}%</span>
						</label>
						{#if enabled}
							<input
								class="opacity-slider"
								type="range"
								min="0"
								max="100"
								value={opacity}
								oninput={(event) => handleOpacityInput(layer, Number(event.currentTarget.value))}
							/>
						{/if}
					</div>
				{/each}
			</div>
		</section>

		<section class="panel-card metrics-card">
			<div class="card-title">
				<span>Analysis Tools</span>
				<small>auto-assist</small>
			</div>
			<div class="metric-grid">
				{#each chartMetrics as metric}
					<div class="metric" style="--metric-color: {metric.color}">
						<span>{metric.label}</span>
						<strong>{metric.value}</strong>
						<small>{metric.trend}</small>
					</div>
				{/each}
			</div>
			<svg class="signal-chart" viewBox="0 0 320 128" role="img" aria-label="Combined sensor signal chart">
				<defs>
					<linearGradient id="thermalFill" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stop-color="#ff9b54" stop-opacity="0.55" />
						<stop offset="100%" stop-color="#ff9b54" stop-opacity="0" />
					</linearGradient>
					<linearGradient id="mlFill" x1="0" x2="0" y1="0" y2="1">
						<stop offset="0%" stop-color="#67e985" stop-opacity="0.45" />
						<stop offset="100%" stop-color="#67e985" stop-opacity="0" />
					</linearGradient>
				</defs>
				<path class="chart-grid" d="M12 24H308M12 64H308M12 104H308" />
				<path class="chart-area thermal" d="M12 102 C48 96 64 78 92 58 C120 35 140 8 164 26 C196 50 202 86 232 76 C260 68 284 86 308 96 L308 118 L12 118 Z" />
				<path class="chart-line thermal-line" d="M12 102 C48 96 64 78 92 58 C120 35 140 8 164 26 C196 50 202 86 232 76 C260 68 284 86 308 96" />
				<path class="chart-area ml" d="M12 108 C42 100 62 90 86 72 C120 47 148 50 178 62 C208 74 222 46 252 42 C282 40 294 72 308 80 L308 118 L12 118 Z" />
				<path class="chart-line ml-line" d="M12 108 C42 100 62 90 86 72 C120 47 148 50 178 62 C208 74 222 46 252 42 C282 40 294 72 308 80" />
			</svg>
		</section>

		<section class="panel-card stack-card">
			<div class="card-title">
				<span>Evidence Stack</span>
				<small>{enabledLayers($selectedLocation.layers).length} layers</small>
			</div>
			<div class="stack-stage">
				{#each enabledLayers($selectedLocation.layers) as layer, i (layer.id)}
					<div
						class="stack-plane"
						style="--i: {i}; --plane-color: {getLayerColor(layer.type)}; --total: {enabledLayers($selectedLocation.layers).length}"
					>
						<span>{layer.name}</span>
					</div>
				{/each}
				{#if enabledLayers($selectedLocation.layers).length === 0}
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

	.panel-header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
		padding: 4px 4px 2px;
	}

	.eyebrow,
	.card-title small {
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.18em;
		text-transform: uppercase;
		color: rgba(129, 220, 255, 0.76);
	}

	h2 {
		margin: 4px 0 0;
		font-size: 18px;
		line-height: 1.1;
		font-weight: 750;
		letter-spacing: -0.03em;
	}

	.status-pill {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 6px 9px;
		border: 1px solid rgba(103, 233, 133, 0.22);
		border-radius: 999px;
		background: rgba(103, 233, 133, 0.08);
		font-size: 10px;
		font-weight: 800;
		text-transform: uppercase;
		letter-spacing: 0.12em;
		color: rgba(179, 255, 195, 0.9);
		white-space: nowrap;
	}

	.status-pill span {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: #67e985;
		box-shadow: 0 0 14px #67e985;
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

	.metric-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 8px;
	}

	.metric {
		padding: 9px;
		border: 1px solid color-mix(in srgb, var(--metric-color) 35%, transparent);
		border-radius: 12px;
		background: color-mix(in srgb, var(--metric-color) 9%, transparent);
	}

	.metric span,
	.metric small {
		display: block;
		font-size: 9px;
		line-height: 1.2;
		color: rgba(232, 241, 255, 0.55);
	}

	.metric strong {
		display: block;
		margin: 4px 0 2px;
		font-size: 17px;
		font-variant-numeric: tabular-nums;
		color: color-mix(in srgb, var(--metric-color) 84%, white);
	}

	.signal-chart {
		width: 100%;
		height: 126px;
		margin-top: 10px;
	}

	.chart-grid {
		fill: none;
		stroke: rgba(255, 255, 255, 0.08);
		stroke-width: 1;
	}

	.chart-area.thermal {
		fill: url(#thermalFill);
	}

	.chart-area.ml {
		fill: url(#mlFill);
	}

	.chart-line {
		fill: none;
		stroke-width: 2.5;
		stroke-linecap: round;
	}

	.thermal-line {
		stroke: #ff9b54;
	}

	.ml-line {
		stroke: #67e985;
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

		.panel-header,
		.metrics-card,
		.stack-card {
			display: none;
		}
	}
</style>
