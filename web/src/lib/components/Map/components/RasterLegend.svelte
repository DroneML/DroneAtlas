<script lang="ts">
	import { rasterLayers } from '../store';
	import { COLORMAPS, getGradientStyle, getLegendInfo, formatTickValue, computeTicks } from '../utils/colormapDefinitions';

	export let visible: boolean = true;

	// Get the first visible NON-project raster layer (project layers show inline legends)
	$: visibleRaster = Array.from($rasterLayers.values()).find(
		(layer) => layer.isVisible && !layer.id.startsWith('project-')
	);

	$: gradientStyle = visibleRaster ? getGradientStyle(visibleRaster.colormap ?? 'viridis') : '';
	$: legendInfo = visibleRaster
		? getLegendInfo(visibleRaster.name, visibleRaster.id, visibleRaster.layerMetadata)
		: { title: 'Value', unit: '' };
	$: minValue = visibleRaster?.rescale?.[0] ?? 0;
	$: maxValue = visibleRaster?.rescale?.[1] ?? 1;
	$: tickValues = computeTicks(minValue, maxValue, 6);
</script>

{#if visible && visibleRaster}
	<div class="raster-legend">
		<div class="legend-title">
			<span class="font-semibold">{legendInfo.title}</span>
			<span class="text-xs opacity-75">({visibleRaster.name})</span>
		</div>

		<div class="gradient-container">
			<div class="gradient-bar" style="background: {gradientStyle}"></div>
			<div class="tick-container">
				{#each tickValues as value}
					<div
						class="tick-mark"
						style="left: {((value - minValue) / (maxValue - minValue || 1)) * 100}%"
					>
						<div class="tick-line"></div>
						<div class="tick-label">{formatTickValue(value, minValue, maxValue, legendInfo.unit)}</div>
					</div>
				{/each}
			</div>
		</div>
	</div>
{/if}

<style>
	.raster-legend {
		position: absolute;
		bottom: 80px;
		left: 50%;
		transform: translateX(-50%);
		background: white;
		padding: 10px 30px 0px;
		border-radius: 8px;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
		z-index: 10;
	}

	.legend-title {
		margin-bottom: 8px;
		font-size: 14px;
	}

	.gradient-container {
		position: relative;
		margin-bottom: 8px;
	}

	.gradient-bar {
		height: 20px;
		border-radius: 4px;
		border: 1px solid #ddd;
		width: 100%;
	}

	.tick-container {
		position: relative;
		height: 30px;
		margin-top: 4px;
	}

	.tick-mark {
		position: absolute;
		display: flex;
		flex-direction: column;
		align-items: center;
		transform: translateX(-50%);
	}

	.tick-line {
		width: 1px;
		height: 6px;
		background: #666;
	}

	.tick-label {
		font-size: 11px;
		margin-top: 2px;
		white-space: nowrap;
		color: #666;
	}
</style>
