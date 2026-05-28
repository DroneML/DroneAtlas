<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as MaplibreMap, LngLatLike } from 'maplibre-gl';
	import { WEESP_IMAGE_URLS } from '$lib/demo/weesp';

	export let map: MaplibreMap | null = null;
	export let bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
	export let visible: boolean = false;
	export let progress: number = 0; // 0..1 within slide 5

	// Pixel-space projection of the bbox corners.
	let left = 0,
		top = 0,
		width = 0,
		height = 0;

	function recompute() {
		if (!map) return;
		const sw = map.project([bbox[0], bbox[1]] as LngLatLike);
		const ne = map.project([bbox[2], bbox[3]] as LngLatLike);
		left = Math.min(sw.x, ne.x);
		top = Math.min(sw.y, ne.y);
		width = Math.abs(ne.x - sw.x);
		height = Math.abs(ne.y - sw.y);
	}

	let raf: number | null = null;
	function loop() {
		recompute();
		raf = requestAnimationFrame(loop);
	}

	onMount(() => {
		if (map) {
			recompute();
			raf = requestAnimationFrame(loop);
		}
	});
	onDestroy(() => {
		if (raf !== null) cancelAnimationFrame(raf);
	});

	// Staggered fade-in thresholds for each visual layer.
	$: lidarOp = opacityAt(progress, 0.08, 0.25);
	$: multispectralOp = opacityAt(progress, 0.38, 0.55);
	$: thermalOp = opacityAt(progress, 0.68, 0.85);

	function opacityAt(p: number, start: number, full: number): number {
		if (p < start) return 0;
		if (p >= full) return 1;
		return (p - start) / (full - start);
	}
</script>

{#if visible && width > 10 && height > 10}
	<div
		class="sensor-stack z-15 pointer-events-none absolute"
		style="left: {left}px; top: {top}px; width: {width}px; height: {height}px;"
	>
		<div class="layer lidar" style="opacity: {lidarOp}"><img src={WEESP_IMAGE_URLS.lidar} alt="" /></div>
		<div class="layer multispectral" style="opacity: {multispectralOp}"><img src={WEESP_IMAGE_URLS.multispectral} alt="" /></div>
		<div class="layer thermal" style="opacity: {thermalOp}"><img src={WEESP_IMAGE_URLS.thermal} alt="" /></div>
		<div class="frame"></div>
		<div class="corner tl"></div>
		<div class="corner tr"></div>
		<div class="corner bl"></div>
		<div class="corner br"></div>
	</div>
{/if}

<style>
	.z-15 {
		z-index: 15;
	}
	.sensor-stack {
		mix-blend-mode: screen;
	}
	.layer {
		position: absolute;
		inset: 0;
		border-radius: 4px;
		overflow: hidden;
		transition: opacity 0.4s ease-out;
	}
	.layer img {
		width: 100%;
		height: 100%;
		object-fit: fill;
	}
	.thermal,
	.multispectral,
	.lidar {
		mix-blend-mode: screen;
	}
	.frame {
		position: absolute;
		inset: 0;
		border: 1px solid rgba(57, 210, 255, 0.55);
		border-radius: 4px;
		box-shadow: 0 0 18px rgba(57, 210, 255, 0.25);
	}
	.corner {
		position: absolute;
		width: 14px;
		height: 14px;
		border-color: #39d2ff;
		border-style: solid;
	}
	.tl {
		top: -2px;
		left: -2px;
		border-width: 2px 0 0 2px;
	}
	.tr {
		top: -2px;
		right: -2px;
		border-width: 2px 2px 0 0;
	}
	.bl {
		bottom: -2px;
		left: -2px;
		border-width: 0 0 2px 2px;
	}
	.br {
		bottom: -2px;
		right: -2px;
		border-width: 0 2px 2px 0;
	}
</style>
