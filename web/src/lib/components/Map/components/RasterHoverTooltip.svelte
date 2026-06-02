<script lang="ts">
	import { formatHoverRasterValue, isProbabilityLayerName } from '../utils/rasterValueFormat';

	export let hoverInRaster = false;
	export let hoverRasterValue: number | null = null;
	export let hoverRasterName: string | null = null;
	export let hoverMousePos: { x: number; y: number } | null = null;
	export let showPopover = false;
</script>

{#if hoverInRaster && hoverRasterValue !== null && hoverMousePos && !showPopover}
	<div
		class="raster-cursor-dot pointer-events-none fixed z-[999] h-2 w-2"
		style="left: {hoverMousePos.x}px; top: {hoverMousePos.y}px; transform: translate(-50%, -50%);"
	></div>
	<div
		class="raster-tooltip pointer-events-none fixed z-[1000] whitespace-nowrap px-2 py-1 text-xs"
		style="left: {hoverMousePos.x}px; top: {hoverMousePos.y}px; transform: translate(10px, -115%);"
	>
		{isProbabilityLayerName(hoverRasterName) ? 'Prediction' : 'Value'}:
		{formatHoverRasterValue(hoverRasterValue, hoverRasterName)}
	</div>
{/if}

<style>
	.raster-cursor-dot {
		border: 1px solid #f7fdff;
		border-radius: 50%;
		background: #ff9b54;
		box-shadow: 0 0 0 4px rgba(255, 155, 84, 0.15), 0 0 18px rgba(255, 155, 84, 0.72);
	}

	.raster-tooltip {
		border: 1px solid rgba(167, 213, 255, 0.14);
		border-radius: 10px;
		background: rgba(8, 13, 21, 0.72);
		box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.07), 0 14px 30px rgba(0, 0, 0, 0.28);
		backdrop-filter: blur(14px);
		color: rgba(232, 241, 255, 0.92);
		font-weight: 750;
	}
</style>
