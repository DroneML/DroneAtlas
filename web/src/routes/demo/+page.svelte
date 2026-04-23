<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { generateFlightPath } from '$lib/demo/path';
	import { DroneLayer } from '$lib/demo/DroneLayer';
	import { createTimeline, type Timeline, type Beat } from '$lib/demo/timeline';
	import { buildBeats, type SceneRefs } from '$lib/demo/beats';
	import { loadMlHeightfield, syntheticHeightfield } from '$lib/demo/mlHeightfield';
	import { projectLocations } from '$lib/stores/projects.store';
	import { get } from 'svelte/store';
	import HUD from '$lib/demo/components/HUD.svelte';
	import ColdOpen from '$lib/demo/components/ColdOpen.svelte';
	import SensorReveal from '$lib/demo/components/SensorReveal.svelte';
	import DetectionCards from '$lib/demo/components/DetectionCards.svelte';
	import EndCard from '$lib/demo/components/EndCard.svelte';
	import SlideNav from '$lib/demo/components/SlideNav.svelte';
	import PresenterNotes from '$lib/demo/components/PresenterNotes.svelte';
	import SlideEndHint from '$lib/demo/components/SlideEndHint.svelte';
	import SensorStack from '$lib/demo/components/SensorStack.svelte';
	import SplitReveal from '$lib/demo/components/SplitReveal.svelte';
	import HeroDrone from '$lib/demo/components/HeroDrone.svelte';

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | null = null;
	let droneLayer: DroneLayer | null = null;
	let timeline: Timeline | null = null;
	let beats: Beat[] = [];

	// Reactive slide state
	let slideIndex = 0;
	let slideEnd = false;
	let playing = false;
	let slideStarted = false; // true once the first Play/Advance happens
	let showNotes = false;

	// Per-slide UI state driven by beat refs
	let altitude = 0;
	let speed = 0;
	let coverageKm2 = 0;
	let detections = 0;
	let sensorStackProgress = 0;
	let splitRevealProgress = 0;
	let surveyBoxVisible = false;

	let sensors = [
		{ id: 'rgb', label: 'RGB · Visible', color: '#39d2ff', active: false },
		{ id: 'thermal', label: 'Thermal · LWIR', color: '#ff6b6b', active: false },
		{ id: 'lidar', label: 'LiDAR · DSM', color: '#06ffa5', active: false },
		{ id: 'ml', label: 'ML · Prediction', color: '#ffb84d', active: false }
	];
	let detectionCards = [
		{
			id: 'foundation',
			label: 'Buried foundation · high conf.',
			confidence: 0.92,
			color: '#ffb84d',
			visible: false
		},
		{ id: 'wall', label: 'Linear wall trace', confidence: 0.84, color: '#39d2ff', visible: false },
		{
			id: 'pit',
			label: 'Thermal anomaly · pit',
			confidence: 0.77,
			color: '#ff6b6b',
			visible: false
		}
	];

	const path = generateFlightPath();

	// Survey box bbox comes from the flight path, padded slightly.
	const pad = 0.0003;
	const surveyBbox: [number, number, number, number] = [
		path.bbox[0] - pad,
		path.bbox[1] - pad,
		path.bbox[2] + pad,
		path.bbox[3] + pad
	];

	const finaleStats = [
		{ label: 'AREA MAPPED', value: '0.36 km²' },
		{ label: 'SENSORS', value: '4' },
		{ label: 'SITES', value: '3' },
		{ label: 'PIPELINE', value: 'RGB · THERM · LIDAR · ML' }
	];

	$: currentBeat = beats[slideIndex];
	$: showTelemetry = currentBeat?.showTelemetry ?? false;
	$: showColdOpen = currentBeat?.id === 'title';
	$: showProblemOverlay = currentBeat?.id === 'problem';
	$: showEndCard = currentBeat?.id === 'close';
	$: isLastSlide = slideIndex === beats.length - 1;
	$: showSensorStack = currentBeat?.id === 'stack';
	$: showSplitReveal = currentBeat?.id === 'insight';
	// Hero drone flies alongside the camera through most slides. Hide on the
	// title/problem/close overlays (full-screen cards) and on 'finding' where
	// the heightfield mesh and the in-scene drone take centre stage.
	$: heroDroneVisible =
		slideStarted &&
		currentBeat?.id !== 'title' &&
		currentBeat?.id !== 'problem' &&
		currentBeat?.id !== 'finding' &&
		currentBeat?.id !== 'close';
	$: heroDroneMode = (
		currentBeat?.id === 'flight' || currentBeat?.id === 'site' ? 'flight' : 'idle'
	) as 'flight' | 'idle';

	function handleKeydown(e: KeyboardEvent) {
		if (!timeline) return;
		const key = e.key;
		if (key === ' ' || key === 'Spacebar') {
			e.preventDefault();
			if (!slideStarted) {
				startPresentation();
			} else if (slideEnd) {
				timeline.nextSlide();
			} else if (playing) {
				timeline.pause();
			} else {
				timeline.play();
			}
		} else if (key === 'ArrowRight' || key === 'PageDown') {
			e.preventDefault();
			if (!slideStarted) {
				startPresentation();
			} else {
				timeline.nextSlide();
			}
		} else if (key === 'ArrowLeft' || key === 'PageUp') {
			e.preventDefault();
			timeline.prevSlide();
		} else if (key === 'Home') {
			e.preventDefault();
			resetAll();
		} else if (key === 'r' || key === 'R') {
			e.preventDefault();
			resetAll();
		} else if (key === 'n' || key === 'N') {
			e.preventDefault();
			showNotes = !showNotes;
		}
	}

	function handleMapClick() {
		if (!timeline) return;
		if (!slideStarted) {
			startPresentation();
			return;
		}
		if (slideEnd && !isLastSlide) timeline.nextSlide();
	}

	function startPresentation() {
		if (!timeline) return;
		slideStarted = true;
		timeline.play();
	}

	function resetAll() {
		if (!timeline) return;
		sensors = sensors.map((s) => ({ ...s, active: false }));
		detectionCards = detectionCards.map((d) => ({ ...d, visible: false }));
		surveyBoxVisible = false;
		sensorStackProgress = 0;
		splitRevealProgress = 0;
		slideStarted = false;
		timeline.seek(0);
	}

	function jumpToSlide(idx: number) {
		if (!timeline) return;
		const target = beats[idx];
		if (!target) return;
		slideStarted = true;
		timeline.seek(target.start);
		timeline.play();
	}

	onMount(() => {
		const maptilerKey = import.meta.env.VITE_MAPTILER_KEY || 'vJWNfIkxpqqguYqYGv4V';

		// Hybrid style: MapTiler satellite imagery + minimal country/place
		// labels on top. No roads, POIs, or building outlines — so the demo's
		// drone path, survey box and overlays stay the focus.
		const minimalStyle: maplibregl.StyleSpecification = {
			version: 8,
			glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${maptilerKey}`,
			sources: {
				satellite: {
					type: 'raster',
					tiles: [`https://api.maptiler.com/tiles/satellite-v2/{z}/{x}/{y}.jpg?key=${maptilerKey}`],
					tileSize: 512,
					maxzoom: 20,
					attribution: '© MapTiler · © Maxar'
				},
				omt: {
					type: 'vector',
					url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${maptilerKey}`
				},
				'terrain-dem': {
					type: 'raster-dem',
					tiles: [
						`https://api.maptiler.com/tiles/terrain-rgb-v2/{z}/{x}/{y}.webp?key=${maptilerKey}`
					],
					tileSize: 256,
					maxzoom: 14,
					encoding: 'mapbox'
				}
			},
			layers: [
				{
					id: 'bg',
					type: 'background',
					paint: { 'background-color': '#0c0f14' }
				},
				{
					id: 'satellite',
					type: 'raster',
					source: 'satellite',
					paint: { 'raster-opacity': 1, 'raster-saturation': -0.1 }
				},
				{
					id: 'boundary-country',
					type: 'line',
					source: 'omt',
					'source-layer': 'boundary',
					filter: ['==', ['get', 'admin_level'], 2],
					paint: {
						'line-color': '#ffdc5c',
						'line-width': ['interpolate', ['linear'], ['zoom'], 2, 0.7, 8, 1.6],
						'line-opacity': 0.9
					}
				},
				{
					id: 'boundary-state',
					type: 'line',
					source: 'omt',
					'source-layer': 'boundary',
					filter: ['==', ['get', 'admin_level'], 4],
					minzoom: 4,
					paint: {
						'line-color': '#ffdc5c',
						'line-width': 0.6,
						'line-dasharray': [3, 2],
						'line-opacity': 0.55
					}
				},
				{
					id: 'place-country',
					type: 'symbol',
					source: 'omt',
					'source-layer': 'place',
					filter: ['==', ['get', 'class'], 'country'],
					layout: {
						'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
						'text-font': ['Open Sans Semibold'],
						'text-size': ['interpolate', ['linear'], ['zoom'], 2, 12, 6, 16],
						'text-letter-spacing': 0.1,
						'text-transform': 'uppercase'
					},
					paint: {
						'text-color': '#ffffff',
						'text-halo-color': 'rgba(10, 14, 22, 0.8)',
						'text-halo-width': 1.6
					}
				},
				{
					id: 'place-city',
					type: 'symbol',
					source: 'omt',
					'source-layer': 'place',
					filter: ['in', ['get', 'class'], ['literal', ['city', 'town']]],
					minzoom: 4,
					layout: {
						'text-field': ['coalesce', ['get', 'name:en'], ['get', 'name']],
						'text-font': ['Open Sans Regular'],
						'text-size': ['interpolate', ['linear'], ['zoom'], 4, 11, 12, 14]
					},
					paint: {
						'text-color': '#f2f4f7',
						'text-halo-color': 'rgba(10, 14, 22, 0.7)',
						'text-halo-width': 1.3
					}
				}
			]
		};

		map = new maplibregl.Map({
			container: mapContainer,
			style: minimalStyle,
			center: path.center,
			zoom: 2.5,
			pitch: 0,
			bearing: 0,
			interactive: false,
			attributionControl: false
		});

		map.on('load', () => {
			if (!map) return;

			// 3D terrain relief driven by the same raster-dem source used by
			// the hillshade layer in the style.
			try {
				map.setTerrain({ source: 'terrain-dem', exaggeration: 1.2 });
			} catch (err) {
				console.warn('[demo] terrain unsupported, continuing flat', err);
			}

			droneLayer = new DroneLayer({ path });
			map.addLayer(droneLayer);

			// Preload the ML prediction heightfield for slide 7 early so it's
			// ready by the time the user reaches it. Falls back to a procedural
			// mesh if the network/parse fails.
			preloadHeightfield();

			const refs: SceneRefs = {
				map,
				droneLayer,
				path,
				setSensorActive: (id, active) => {
					sensors = sensors.map((s) => (s.id === id ? { ...s, active } : s));
				},
				setDetectionVisible: (id, visible) => {
					detectionCards = detectionCards.map((d) => (d.id === id ? { ...d, visible } : d));
				},
				setTelemetry: (t) => {
					if (t.altitude !== undefined) altitude = t.altitude;
					if (t.speed !== undefined) speed = t.speed;
					if (t.coverageKm2 !== undefined) coverageKm2 = t.coverageKm2;
					if (t.detections !== undefined) detections = t.detections;
				},
				setSensorStackProgress: (p) => (sensorStackProgress = p),
				setSplitReveal: (p) => (splitRevealProgress = p),
				setSurveyBox: (v) => (surveyBoxVisible = v)
			};

			const built = buildBeats(refs);
			timeline = createTimeline(built);
			beats = timeline.beats;

			timeline.state.subscribe((s) => {
				slideIndex = s.slideIndex;
				slideEnd = s.atSlideEnd;
				playing = s.playing;
			});
		});

		window.addEventListener('keydown', handleKeydown);
	});

	async function preloadHeightfield() {
		if (!droneLayer) return;
		const locations = get(projectLocations);
		const veldhoven = locations.find((l) => l.id === 'veldhoven');
		const mlLayer = veldhoven?.layers.find((l) => l.type === 'ml-prediction');
		const url = mlLayer?.sourceUrl ?? '/mock/veldhoven/ml_prediction.tif';
		try {
			const hf = await loadMlHeightfield(url, 128);
			droneLayer.setFindingHeightfield(hf, { heightMeters: 40 });
		} catch (err) {
			console.warn('[demo] ml_prediction.tif failed to load; using synthetic fallback', err);
			const hf = syntheticHeightfield(path.center, 0.003, 96);
			droneLayer.setFindingHeightfield(hf, { heightMeters: 35 });
		}
	}

	onDestroy(() => {
		window.removeEventListener('keydown', handleKeydown);
		timeline?.destroy();
		map?.remove();
	});
</script>

<svelte:head>
	<title>DroneAtlas — Live Demo</title>
</svelte:head>

<!-- Click-to-advance on the demo root. Buttons inside stop propagation. -->
<div class="demo-root fixed inset-0 overflow-hidden" on:click={handleMapClick} role="presentation">
	<div bind:this={mapContainer} class="absolute inset-0"></div>

	<!-- Hero drone flies in front of the camera across most slides -->
	<HeroDrone visible={heroDroneVisible} mode={heroDroneMode} />

	<!-- Survey box overlay (pinned to map) for stack & split-reveal slides -->
	{#if showSensorStack}
		<SensorStack
			{map}
			bbox={surveyBbox}
			visible={surveyBoxVisible}
			progress={sensorStackProgress}
		/>
	{/if}
	{#if showSplitReveal}
		<SplitReveal
			{map}
			bbox={surveyBbox}
			visible={surveyBoxVisible}
			progress={splitRevealProgress}
		/>
	{/if}

	<!-- Centered title / problem overlay (slides 1 & 2) -->
	<ColdOpen
		visible={showColdOpen && slideStarted}
		kicker="DRONEATLAS · NETHERLANDS eSCIENCE CENTER"
		title={'DroneAtlas'}
		subtitle={'Seeing what the ground hides.'}
		variant="hero"
	/>
	<ColdOpen
		visible={showProblemOverlay}
		kicker="THE CHALLENGE"
		title={'Terabytes of sensor data.\nAn explorable insight is the hard part.'}
		subtitle={''}
		variant="problem"
	/>

	<HUD
		slideTitle={currentBeat?.title ?? ''}
		subtitle={currentBeat?.subtitle ?? ''}
		caption={currentBeat?.caption ?? ''}
		{altitude}
		{speed}
		{coverageKm2}
		{detections}
		{showTelemetry}
	/>

	<SensorReveal {sensors} />
	<DetectionCards detections={detectionCards} />
	<EndCard
		visible={showEndCard}
		kicker="DRONEATLAS"
		tagline={'Making drone data<br />explorable.'}
		stats={finaleStats}
	/>

	{#if timeline && beats.length > 0 && slideStarted}
		<SlideNav
			slides={beats}
			current={slideIndex}
			onJump={jumpToSlide}
			onPrev={() => timeline?.prevSlide()}
			onNext={() => timeline?.nextSlide()}
		/>
		<SlideEndHint visible={slideEnd} atLastSlide={isLastSlide} />
		<PresenterNotes
			visible={showNotes}
			title={currentBeat?.title ?? ''}
			note={currentBeat?.presenterNote ?? ''}
			slideNum={slideIndex + 1}
			totalSlides={beats.length}
		/>
	{/if}

	{#if !slideStarted}
		<button class="start-btn" on:click|stopPropagation={startPresentation}>
			<span class="play-icon">▶</span>
			<span>Start presentation</span>
			<span class="hint">→ next slide · SPACE pause · N notes · R restart</span>
		</button>
	{/if}

	<!-- Vignette overlay -->
	<div class="vignette pointer-events-none absolute inset-0 z-10"></div>
</div>

<style>
	:global(body) {
		background: #0a0e15;
	}
	.demo-root {
		background: #0a0e15;
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
		box-shadow:
			0 8px 32px rgba(57, 210, 255, 0.4),
			0 0 0 0 rgba(57, 210, 255, 0.4);
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
			box-shadow:
				0 8px 32px rgba(57, 210, 255, 0.4),
				0 0 0 0 rgba(57, 210, 255, 0.4);
		}
		50% {
			box-shadow:
				0 8px 32px rgba(57, 210, 255, 0.4),
				0 0 0 16px rgba(57, 210, 255, 0);
		}
	}
	.vignette {
		background: radial-gradient(ellipse at center, transparent 50%, rgba(0, 0, 0, 0.55) 100%);
	}
	:global(.demo-root .maplibregl-canvas) {
		outline: none !important;
	}
</style>
