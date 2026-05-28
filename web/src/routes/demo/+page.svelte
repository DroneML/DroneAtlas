<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import maplibregl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import { generateFlightPath } from '$lib/demo/path';
	import { DroneLayer } from '$lib/demo/DroneLayer';
	import { createTimeline, type Timeline, type Beat } from '$lib/demo/timeline';
	import { buildBeats, type SceneRefs } from '$lib/demo/beats';
	import SensorReveal from '$lib/demo/components/SensorReveal.svelte';
	import DetectionCards from '$lib/demo/components/DetectionCards.svelte';
	import PresenterNotes from '$lib/demo/components/PresenterNotes.svelte';
	import SensorStack from '$lib/demo/components/SensorStack.svelte';
	import SplitReveal from '$lib/demo/components/SplitReveal.svelte';
	import HeroDrone from '$lib/demo/components/HeroDrone.svelte';
	import ScientificNarrativeOverlay from '$lib/demo/components/ScientificNarrativeOverlay.svelte';
	import { WEESP_DEMO_CENTER, WEESP_IMAGE_BOUNDS } from '$lib/demo/weesp';

	let mapContainer: HTMLDivElement;
	let map: maplibregl.Map | null = null;
	let droneLayer: DroneLayer | null = null;
	let timeline: Timeline | null = null;
	let beats: Beat[] = [];

	// Reactive slide state
	let slideIndex = 0;
	let beatProgress = 0;
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
	let analysisPopupVisible = false;

	let sensors = [
		{ id: 'rgb', label: 'RGB · Visible', color: '#39d2ff', active: false },
		{ id: 'lidar', label: 'LiDAR · Relief', color: '#06ffa5', active: false },
		{ id: 'multispectral', label: 'Multispectral · NDVI', color: '#67e985', active: false },
		{ id: 'thermal', label: 'Thermal · LWIR', color: '#ff6b6b', active: false }
	];
	let detectionCards = [
		{
			id: 'foundation',
			label: 'Stone wall signal · high conf.',
			confidence: 0.92,
			color: '#ffb84d',
			visible: false
		},
		{ id: 'wall', label: 'Moat edge trace', confidence: 0.84, color: '#39d2ff', visible: false },
		{
			id: 'pit',
			label: 'Possible wall debris',
			confidence: 0.77,
			color: '#ff6b6b',
			visible: false
		}
	];

	const path = generateFlightPath({ center: WEESP_DEMO_CENTER, passes: 5, passLengthKm: 0.18, passSpacingM: 28, baseAlt: 72 });
	const surveyBbox = WEESP_IMAGE_BOUNDS;

	$: currentBeat = beats[slideIndex];
	$: showTelemetry = currentBeat?.showTelemetry ?? false;
	$: isLastSlide = slideIndex === beats.length - 1;
	$: showSensorStack =
		currentBeat?.id === 'search' ||
		currentBeat?.id === 'sensors' ||
		currentBeat?.id === 'process' ||
		currentBeat?.id === 'explore' ||
		currentBeat?.id === 'insight';
	$: showSplitReveal =
		currentBeat?.id === 'droneml' || currentBeat?.id === 'ml' || currentBeat?.id === 'process';
	// Hero drone is visible immediately and during the opening map flight, then
	// fades after arrival before returning for the later platform fly-through.
	$: showingOpeningFlight =
		!slideStarted || (currentBeat?.id === 'search' && beatProgress < 0.92);
	$: showingPlatformFlight =
		currentBeat?.id === 'process' || currentBeat?.id === 'explore' || currentBeat?.id === 'insight';
	$: heroDroneVisible = showingOpeningFlight || showingPlatformFlight;
	$: heroDroneMode = (
		!slideStarted
			? 'idle'
			: currentBeat?.id === 'search'
				? 'transit'
				: currentBeat?.id === 'process' || currentBeat?.id === 'explore'
				? 'flight'
				: 'idle'
	) as 'flight' | 'idle' | 'transit';

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
		analysisPopupVisible = false;
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
				setSurveyBox: (v) => (surveyBoxVisible = v),
				setAnalysisPopup: (v) => (analysisPopupVisible = v)
			};

			const built = buildBeats(refs);
			timeline = createTimeline(built);
			beats = timeline.beats;

			timeline.state.subscribe((s) => {
				slideIndex = s.slideIndex;
				beatProgress = s.beatProgress;
				slideEnd = s.atSlideEnd;
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
</script>

<svelte:head>
	<title>DroneAtlas — Live Demo</title>
</svelte:head>

<div class="demo-shell fixed inset-0 overflow-hidden" role="presentation">
	<!-- 16:9 keynote stage. Click-to-advance happens on the slide surface. -->
	<div class="demo-root absolute" on:click={handleMapClick} role="presentation">
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

		<ScientificNarrativeOverlay
			visible={slideStarted}
			slideId={currentBeat?.id ?? ''}
			progress={beatProgress}
		/>

		{#if currentBeat?.caption && slideStarted}
			<div class="slide-caption pointer-events-none absolute inset-x-0 bottom-[7%] z-30 flex justify-center">
				<div>{currentBeat.caption}</div>
			</div>
		{/if}

		<SensorReveal {sensors} />
		<DetectionCards detections={detectionCards} />

		{#if analysisPopupVisible}
			<div class="analysis-popup pointer-events-none absolute z-40">
				<div class="scan-ring"></div>
				<div>
					<div class="analysis-title">Analysing tree...</div>
					<div class="analysis-subtitle">Combining RGB, LiDAR, NDVI, and thermal clues</div>
				</div>
				<div class="analysis-bars" aria-hidden="true">
					<span></span><span></span><span></span>
				</div>
			</div>
		{/if}

		{#if timeline && beats.length > 0 && slideStarted}
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
</div>

<style>
	:global(body) {
		background: #0a0e15;
	}
	.demo-shell {
		background: #0a0e15;
		display: grid;
		place-items: center;
	}
	.demo-shell::before {
		content: '';
		position: absolute;
		inset: 0;
		background:
			radial-gradient(circle at 50% 30%, rgba(57, 210, 255, 0.08), transparent 42%),
			#050810;
	}
	.demo-root {
		width: min(100vw, calc(100vh * 16 / 9));
		height: min(100vh, calc(100vw * 9 / 16));
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		background: #0a0e15;
		overflow: hidden;
		box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.06);
	}
	.slide-caption div {
		max-width: 58%;
		padding: 10px 20px;
		border-radius: 999px;
		background: rgba(5, 9, 16, 0.58);
		border: 1px solid rgba(255, 255, 255, 0.1);
		backdrop-filter: blur(12px);
		color: rgba(255, 255, 255, 0.8);
		font-family: 'Inter', system-ui, sans-serif;
		font-size: clamp(13px, 1.35vw, 18px);
		line-height: 1.3;
		text-align: center;
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
	.analysis-popup {
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);
		display: grid;
		grid-template-columns: auto 1fr auto;
		align-items: center;
		gap: 18px;
		min-width: min(560px, 72vw);
		padding: 24px 28px;
		border-radius: 28px;
		background: linear-gradient(135deg, rgba(7, 12, 22, 0.92), rgba(16, 25, 38, 0.78));
		border: 1px solid rgba(57, 210, 255, 0.36);
		box-shadow:
			0 26px 80px rgba(0, 0, 0, 0.48),
			0 0 42px rgba(57, 210, 255, 0.18);
		backdrop-filter: blur(18px);
		font-family: 'Inter', system-ui, sans-serif;
		color: white;
	}
	.scan-ring {
		width: 54px;
		height: 54px;
		border-radius: 999px;
		border: 2px solid rgba(57, 210, 255, 0.18);
		border-top-color: #39d2ff;
		border-right-color: #06ffa5;
		box-shadow: 0 0 24px rgba(57, 210, 255, 0.26);
		animation: scan-spin 1.1s linear infinite;
	}
	.analysis-title {
		font-size: clamp(22px, 2.7vw, 36px);
		font-weight: 650;
		letter-spacing: -0.04em;
	}
	.analysis-subtitle {
		margin-top: 6px;
		color: rgba(255, 255, 255, 0.68);
		font-size: clamp(12px, 1.25vw, 16px);
	}
	.analysis-bars {
		display: flex;
		align-items: end;
		gap: 4px;
		height: 34px;
	}
	.analysis-bars span {
		width: 5px;
		border-radius: 99px;
		background: #39d2ff;
		animation: analyse-bar 0.8s ease-in-out infinite alternate;
	}
	.analysis-bars span:nth-child(1) {
		height: 14px;
	}
	.analysis-bars span:nth-child(2) {
		height: 26px;
		animation-delay: 0.12s;
		background: #06ffa5;
	}
	.analysis-bars span:nth-child(3) {
		height: 20px;
		animation-delay: 0.24s;
		background: #ffb84d;
	}
	@keyframes scan-spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes analyse-bar {
		to {
			transform: scaleY(0.42);
			opacity: 0.55;
		}
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
