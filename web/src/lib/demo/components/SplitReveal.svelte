<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as MaplibreMap, LngLatLike } from 'maplibre-gl';
	import { WEESP_IMAGE_URLS } from '$lib/demo/weesp';

	export let map: MaplibreMap | null = null;
	export let bbox: [number, number, number, number];
	export let visible: boolean = false;
	export let progress: number = 0; // 0..1 — 0 = RGB only, 1 = ML fully revealed

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

	$: revealPct = Math.max(0, Math.min(1, progress)) * 100;
</script>

{#if visible && width > 10 && height > 10}
	<div
		class="split-reveal z-15 pointer-events-none absolute"
		style="left: {left}px; top: {top}px; width: {width}px; height: {height}px;"
	>
		<div class="base rgb"><img src={WEESP_IMAGE_URLS.rgb} alt="" /></div>
		<div
			class="overlay lidar"
			style="clip-path: polygon(0 0, {revealPct}% 0, {revealPct}% 100%, 0 100%)"
		>
			<img src={WEESP_IMAGE_URLS.lidar} alt="" />
		</div>
		<div class="divider" style="left: {revealPct}%"></div>
		<div class="rgb-lbl label">RGB</div>
		<div class="lidar-lbl label" style="opacity: {progress > 0.15 ? 1 : 0}">LiDAR · RELIEF</div>
		<div class="frame"></div>
	</div>
{/if}

<style>
	.z-15 {
		z-index: 15;
	}
	.base,
	.overlay {
		position: absolute;
		inset: 0;
		border-radius: 4px;
		overflow: hidden;
	}
	.base img,
	.overlay img {
		width: 100%;
		height: 100%;
		object-fit: fill;
	}
	.rgb {
		mix-blend-mode: normal;
	}
	.lidar {
		mix-blend-mode: screen;
	}
	.divider {
		position: absolute;
		top: 0;
		bottom: 0;
		width: 2px;
		background: #39d2ff;
		box-shadow: 0 0 12px #39d2ff;
		transform: translateX(-1px);
	}
	.label {
		position: absolute;
		top: 8px;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 10px;
		letter-spacing: 0.25em;
		color: white;
		background: rgba(8, 14, 22, 0.7);
		padding: 3px 8px;
		border-radius: 3px;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
		transition: opacity 0.3s;
	}
	.rgb-lbl {
		left: 8px;
	}
	.lidar-lbl {
		right: 8px;
		color: #ffd066;
	}
	.frame {
		position: absolute;
		inset: 0;
		border: 1px solid rgba(57, 210, 255, 0.55);
		border-radius: 4px;
		pointer-events: none;
	}
</style>
