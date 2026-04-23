<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import type { Map as MaplibreMap, LngLatLike } from 'maplibre-gl';

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
		style="left: {left}px; top: {top}px; width: {width}px; height: {height}px"
	>
		<div class="base rgb"></div>
		<div
			class="overlay ml"
			style="clip-path: polygon(0 0, {revealPct}% 0, {revealPct}% 100%, 0 100%)"
		>
			<div class="blob b1"></div>
			<div class="blob b2"></div>
			<div class="blob b3"></div>
		</div>
		<div class="divider" style="left: {revealPct}%"></div>
		<div class="rgb-lbl label">RGB</div>
		<div class="ml-lbl label" style="opacity: {progress > 0.15 ? 1 : 0}">ML · CONFIDENCE</div>
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
	}
	.rgb {
		background: repeating-linear-gradient(
				90deg,
				rgba(140, 160, 110, 0.55) 0 14%,
				rgba(120, 140, 95, 0.4) 14% 28%
			),
			linear-gradient(135deg, #6b8a47 0%, #7a9358 50%, #8ca46a 100%);
		mix-blend-mode: multiply;
	}
	.ml {
		background: linear-gradient(135deg, rgba(10, 0, 50, 0.75), rgba(60, 0, 90, 0.4));
		mix-blend-mode: screen;
	}
	.blob {
		position: absolute;
		border-radius: 50%;
		filter: blur(12px);
	}
	.b1 {
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
	.b2 {
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
	.b3 {
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
	.ml-lbl {
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
