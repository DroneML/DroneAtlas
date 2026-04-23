<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as MaplibreMap, LngLatLike } from 'maplibre-gl';

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

	// Staggered fade-in thresholds for each layer (matches presenter notes).
	$: rgbOp = opacityAt(progress, 0.08, 0.25);
	$: thermalOp = opacityAt(progress, 0.3, 0.45);
	$: lidarOp = opacityAt(progress, 0.55, 0.7);
	$: mlOp = opacityAt(progress, 0.78, 0.92);

	function opacityAt(p: number, start: number, full: number): number {
		if (p < start) return 0;
		if (p >= full) return 1;
		return (p - start) / (full - start);
	}
</script>

{#if visible && width > 10 && height > 10}
	<div
		class="sensor-stack z-15 pointer-events-none absolute"
		style="left: {left}px; top: {top}px; width: {width}px; height: {height}px"
	>
		<div class="layer rgb" style="opacity: {rgbOp}"></div>
		<div class="layer thermal" style="opacity: {thermalOp}"></div>
		<div class="layer lidar" style="opacity: {lidarOp}"></div>
		<div class="layer ml" style="opacity: {mlOp}">
			<div class="blob b1"></div>
			<div class="blob b2"></div>
			<div class="blob b3"></div>
		</div>
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
		transition: opacity 0.4s ease-out;
	}
	.rgb {
		background: repeating-linear-gradient(
				90deg,
				rgba(140, 160, 110, 0.5) 0 14%,
				rgba(120, 140, 95, 0.35) 14% 28%
			),
			repeating-linear-gradient(0deg, rgba(90, 110, 70, 0.25) 0 10%, transparent 10% 20%),
			linear-gradient(135deg, #6b8a47 0%, #7a9358 50%, #8ca46a 100%);
		mix-blend-mode: multiply;
	}
	.thermal {
		background: radial-gradient(
				ellipse 28% 38% at 35% 45%,
				rgba(255, 200, 60, 0.85),
				transparent 70%
			),
			radial-gradient(ellipse 22% 30% at 65% 60%, rgba(255, 100, 40, 0.75), transparent 70%),
			linear-gradient(
				90deg,
				rgb(20, 0, 60) 0%,
				rgb(120, 20, 80) 25%,
				rgb(220, 80, 40) 55%,
				rgb(255, 200, 40) 85%,
				rgb(255, 255, 180) 100%
			);
		mix-blend-mode: screen;
		filter: blur(2px);
	}
	.lidar {
		background: repeating-linear-gradient(
				45deg,
				rgba(255, 255, 255, 0.08) 0 2px,
				transparent 2px 5px
			),
			linear-gradient(45deg, #1a3828 0%, #3d6b46 30%, #9fb88a 55%, #d4c998 80%, #f4ebc8 100%);
		mix-blend-mode: screen;
	}
	.ml {
		background: linear-gradient(135deg, rgba(10, 0, 50, 0.75), rgba(60, 0, 90, 0.4));
		mix-blend-mode: screen;
	}
	.ml .blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(12px);
	}
	.ml .b1 {
		left: 30%;
		top: 38%;
		width: 26%;
		height: 20%;
		background: radial-gradient(
			ellipse,
			rgba(250, 240, 50, 0.95),
			rgba(240, 130, 60, 0.6) 40%,
			transparent 75%
		);
	}
	.ml .b2 {
		left: 54%;
		top: 50%;
		width: 22%;
		height: 18%;
		background: radial-gradient(
			ellipse,
			rgba(245, 90, 150, 0.9),
			rgba(180, 40, 120, 0.5) 50%,
			transparent 80%
		);
	}
	.ml .b3 {
		left: 42%;
		top: 24%;
		width: 16%;
		height: 14%;
		background: radial-gradient(
			ellipse,
			rgba(255, 180, 80, 0.85),
			rgba(220, 60, 80, 0.45) 50%,
			transparent 80%
		);
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
