<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { generateFlightPath } from '$lib/demo/path';
	import { DroneLayer } from '$lib/demo/DroneLayer';
	import { createTimeline, type Timeline } from '$lib/demo/timeline';
	import { buildBeats, type SceneRefs } from '$lib/demo/beats';
	import HUD from '$lib/demo/components/HUD.svelte';
	import ColdOpen from '$lib/demo/components/ColdOpen.svelte';
	import SensorReveal from '$lib/demo/components/SensorReveal.svelte';
	import DetectionCards from '$lib/demo/components/DetectionCards.svelte';
	import EndCard from '$lib/demo/components/EndCard.svelte';

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | null = null;
	let droneLayer: DroneLayer | null = null;
	let timeline: Timeline | null = null;

	// Reactive UI state
	let coldOpenVisible = true;
	let endCardVisible = false;
	let beatTitle = '';
	let caption = '';
	let altitude = 0;
	let speed = 0;
	let coverageKm2 = 0;
	let detections = 0;
	let now = 0;
	let totalDuration = 300;
	let beatProgress = 0;
	let playing = false;

	let sensors = [
		{ id: 'rgb', label: 'RGB · Visible', color: '#39d2ff', active: false },
		{ id: 'thermal', label: 'Thermal · LWIR', color: '#ff6b6b', active: false },
		{ id: 'multispectral', label: 'Multispectral · 8-band', color: '#9d4edd', active: false },
		{ id: 'lidar', label: 'LiDAR · Point cloud', color: '#06ffa5', active: false }
	];
	let detectionCards = [
		{ id: 'vegetation', label: 'Vegetation stress (NDVI)', confidence: 0.92, color: '#06ffa5', visible: false },
		{ id: 'structure', label: 'Built structure detected', confidence: 0.88, color: '#39d2ff', visible: false },
		{ id: 'anomaly', label: 'Thermal anomaly · subsurface', confidence: 0.81, color: '#ff6b6b', visible: false }
	];

	function fmtTime(s: number) {
		const m = Math.floor(s / 60);
		const sec = Math.floor(s % 60);
		return `${m}:${sec.toString().padStart(2, '0')}`;
	}

	$: timeStr = fmtTime(now);
	$: totalStr = fmtTime(totalDuration);
	$: progressFraction = totalDuration > 0 ? now / totalDuration : 0;

	const path = generateFlightPath();

	const stats = [
		{ label: 'AREA MAPPED', value: '12.4 km²' },
		{ label: 'DETECTIONS', value: '847' },
		{ label: 'SENSORS', value: '4' },
		{ label: 'FLIGHT TIME', value: '18:42' }
	];

	function handleKeydown(e: KeyboardEvent) {
		if (!timeline) return;
		if (e.key === ' ') {
			e.preventDefault();
			playing ? timeline.pause() : timeline.play();
		} else if (e.key === 'ArrowRight') {
			timeline.nextBeat();
		} else if (e.key === 'ArrowLeft') {
			timeline.prevBeat();
		} else if (e.key === 'r' || e.key === 'R') {
			timeline.seek(0);
			// Reset all UI state
			sensors = sensors.map((s) => ({ ...s, active: false }));
			detectionCards = detectionCards.map((d) => ({ ...d, visible: false }));
			coldOpenVisible = true;
			endCardVisible = false;
		}
	}

	onMount(() => {
		map = new maplibregl.Map({
			container: mapContainer,
			style: {
				version: 8,
				sources: {
					'osm-dark': {
						type: 'raster',
						tiles: ['https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png'],
						tileSize: 256,
						attribution: '© OpenStreetMap, © CARTO'
					}
				},
				layers: [
					{ id: 'bg', type: 'background', paint: { 'background-color': '#050810' } },
					{ id: 'osm', type: 'raster', source: 'osm-dark' }
				]
			},
			center: path.center,
			zoom: 3,
			pitch: 0,
			bearing: 0,
			interactive: false,
			attributionControl: false
		});

		map.on('load', () => {
			if (!map) return;
			droneLayer = new DroneLayer({ path });
			map.addLayer(droneLayer);

			const refs: SceneRefs = {
				map,
				droneLayer,
				path,
				setColdOpenVisible: (v) => (coldOpenVisible = v),
				setSensorActive: (id, active) => {
					sensors = sensors.map((s) => (s.id === id ? { ...s, active } : s));
				},
				setDetectionVisible: (id, visible) => {
					detectionCards = detectionCards.map((d) => (d.id === id ? { ...d, visible } : d));
				},
				setEndCardVisible: (v) => (endCardVisible = v),
				setBeatTitle: (t) => (beatTitle = t),
				setCaption: (c) => (caption = c),
				setTelemetry: (t) => {
					if (t.altitude !== undefined) altitude = t.altitude;
					if (t.speed !== undefined) speed = t.speed;
					if (t.coverageKm2 !== undefined) coverageKm2 = t.coverageKm2;
					if (t.detections !== undefined) detections = t.detections;
				}
			};

			const beats = buildBeats(refs);
			timeline = createTimeline(beats);
			totalDuration = timeline.beats.reduce((a, b) => Math.max(a, b.start + b.duration), 0);

			timeline.state.subscribe((s) => {
				now = s.now;
				beatProgress = s.beatProgress;
				playing = s.playing;
			});
		});

		window.addEventListener('keydown', handleKeydown);
	});

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		timeline?.destroy();
		map?.remove();
	});

	function start() {
		timeline?.play();
	}
</script>

<svelte:head>
	<title>DroneAtlas — Live Demo</title>
</svelte:head>

<div class="demo-root fixed inset-0 bg-black overflow-hidden">
	<div bind:this={mapContainer} class="absolute inset-0"></div>

	<ColdOpen visible={coldOpenVisible} progress={beatProgress} />

	<HUD
		{beatTitle}
		{caption}
		{altitude}
		{speed}
		{coverageKm2}
		{detections}
		{timeStr}
		{totalStr}
		progress={progressFraction}
	/>

	<SensorReveal {sensors} />
	<DetectionCards detections={detectionCards} />
	<EndCard visible={endCardVisible} {stats} />

	{#if !playing && now < 0.1}
		<button class="start-btn" on:click={start}>
			<span class="play-icon">▶</span>
			<span>Start cinematic</span>
			<span class="hint">SPACE play/pause · ← → skip beats · R restart</span>
		</button>
	{/if}

	<!-- Vignette overlay -->
	<div class="vignette pointer-events-none absolute inset-0 z-10"></div>
</div>

<style>
	:global(body) {
		background: black;
	}
	.start-btn {
		position: absolute;
		left: 50%;
		bottom: 12%;
		transform: translateX(-50%);
		z-index: 40;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 8px;
		padding: 18px 36px;
		background: rgba(57, 210, 255, 0.95);
		color: #0a0e15;
		border: none;
		border-radius: 999px;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 16px;
		font-weight: 600;
		letter-spacing: 0.1em;
		cursor: pointer;
		box-shadow: 0 8px 32px rgba(57, 210, 255, 0.4), 0 0 0 0 rgba(57, 210, 255, 0.4);
		animation: pulse-btn 2s infinite;
		transition: transform 0.2s;
	}
	.start-btn:hover {
		transform: translateX(-50%) scale(1.05);
	}
	.play-icon {
		font-size: 24px;
	}
	.hint {
		font-size: 9px;
		letter-spacing: 0.25em;
		opacity: 0.7;
		font-weight: 400;
	}
	@keyframes pulse-btn {
		0%,
		100% {
			box-shadow: 0 8px 32px rgba(57, 210, 255, 0.4), 0 0 0 0 rgba(57, 210, 255, 0.4);
		}
		50% {
			box-shadow: 0 8px 32px rgba(57, 210, 255, 0.4), 0 0 0 16px rgba(57, 210, 255, 0);
		}
	}
	.vignette {
		background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.55) 100%);
	}
	:global(.demo-root .maplibregl-canvas) {
		outline: none !important;
	}
</style>
