<script lang="ts">
	import { base } from '$app/paths';
	import ImageSlot from './ImageSlot.svelte';
	import { WEESP_IMAGE_URLS } from '$lib/demo/weesp';

	export let slideId: string = '';
	export let progress: number = 0;
	export let visible: boolean = true;

	$: p = Math.max(0, Math.min(1, progress));
	$: pct = `${p * 100}%`;
	$: phase = p.toFixed(3);

	const visibleFor = new Set([
		'search',
		'collaboration',
		'use-case',
		'sensors',
		'bottleneck',
		'droneml',
		'ml',
		'software',
		'atlas',
		'process',
		'explore',
		'insight'
	]);

	const articleImages = {
		field: 'https://www.esciencecenter.nl/wp-content/uploads/2025/09/IMG_1146cropped-1024x700.jpg',
		drone: 'https://www.esciencecenter.nl/wp-content/uploads/2025/09/IMG_1091-1024x683.jpg',
		coeus: 'https://www.esciencecenter.nl/wp-content/uploads/2025/09/Picture1-1024x605.png',
		thermal: 'https://www.esciencecenter.nl/wp-content/uploads/2025/09/Picture2.png',
		qgis: 'https://www.esciencecenter.nl/wp-content/uploads/2025/09/Picture5.jpg'
	};
	const localImage = (file: string) => `${base}/demo/weesp/${file}`;
	const imageSlots = {
		historical: localImage('01-historical-castle.jpg'),
		field: localImage('02-weesp-field.jpg'),
		drone: localImage('03-drone-fieldwork.jpg'),
		satelliteAhn: localImage('04-satellite-ahn.jpg'),
		thermal: WEESP_IMAGE_URLS.thermal,
		lidar: WEESP_IMAGE_URLS.lidar,
		ndvi: WEESP_IMAGE_URLS.multispectral,
		allAnomalies: localImage('09-all-anomalies.jpg'),
		coeus: localImage('10-coeus-probability.png'),
		qgis: localImage('11-coeus-qgis.jpg'),
		platform: localImage('12-droneatlas-platform.jpg'),
		process: localImage('13-drag-drop-process.jpg')
	};

	const partners = [
		['4D Research Lab / UvA', 'archaeology, drone surveys, sensor interpretation'],
		['Netherlands eScience Center', 'RSE, ML workflow, reusable software'],
		['Leiden Archaeological Sciences', 'archaeological research collaboration'],
		['Netherlands Forensic Institute', 'broader anomaly-detection relevance'],
		['Gemeente Amsterdam', 'Weesp case context and commissioning'],
		['CAA / AARG community', 'testing, governance, reuse pathway']
	];

	const sensorLayers = [
		{ label: 'LiDAR micro-topography', src: imageSlots.lidar, note: 'Buried wall/moat relief' },
		{ label: 'Multispectral NDVI', src: imageSlots.ndvi, note: 'Vegetation stress' },
		{ label: 'Thermal infrared', src: imageSlots.thermal, note: 'Heat-capacity contrast' }
	];
	const processSteps = ['Drop images', 'Organize layers', 'Adjust opacity', 'Inspect signals'];
</script>

{#if visible && visibleFor.has(slideId)}
	<div class="narrative pointer-events-none absolute inset-0 z-25" style="--p: {phase}; --pct: {pct}">
		<div class="grain"></div>

		{#if slideId === 'search'}
			<section class="hero-card wide left">
				<div class="eyebrow">WEESP CASE STUDY</div>
				<h1>In search<br />of a castle.</h1>
				<div class="opening-lines">
					{#each [
						'A medieval castle disappeared from the landscape.',
						'The traces are still there, but only as faint signals across drone sensor layers.',
						'Layer toggling helps archaeologists compare those signals.',
						'DroneATLAS makes that workflow accessible as a research platform.'
					] as line, i}
						<p style="--i: {i}">{line}</p>
					{/each}
				</div>
			</section>
			<div class="story-photos">
				<div class="photo historical">
					<ImageSlot
						src={imageSlots.historical}
						label="Historical castle image"
						note="Drop 01-historical-castle.jpg here"
						aspect="4 / 3"
						fit="contain"
						variant="paper"
					/>
				</div>
				<div class="story-field">
					<ImageSlot
						src={imageSlots.field}
						fallbackSrc={articleImages.field}
						label="Present-day Weesp field"
						note="Drop 02-weesp-field.jpg here"
					/>
				</div>
				<div class="trace-outline"></div>
			</div>

		{:else if slideId === 'collaboration'}
			<section class="hero-card center compact-top">
				<div class="eyebrow">COLLABORATION</div>
				<h2>Domain science<br />meets research software engineering.</h2>
			</section>
			<div class="partner-grid">
				{#each partners as partner, i}
					<div class="partner-card" style="--i: {i}">
						<strong>{partner[0]}</strong>
						<span>{partner[1]}</span>
					</div>
				{/each}
			</div>

		{:else if slideId === 'use-case'}
			<section class="hero-card left">
				<div class="eyebrow">REAL FIELD CASE</div>
				<h2>'t Huijs ten Bosch, Weesp</h2>
				<p>The site was surveyed in February, June, and September 2022 with optical, thermal, multispectral, and LiDAR sensors.</p>
				<div class="metric-row">
					<div><strong>122M</strong><span>LiDAR points</span></div>
					<div><strong>55</strong><span>mapped anomalies</span></div>
					<div><strong>4</strong><span>sensor families</span></div>
				</div>
			</section>
			<div class="image-pair right">
				<ImageSlot
					src={imageSlots.field}
					fallbackSrc={articleImages.field}
					label="Weesp archaeological field"
					note="Drop 02-weesp-field.jpg here"
				/>
				<ImageSlot
					src={imageSlots.drone}
					fallbackSrc={articleImages.drone}
					label="Drone fieldwork photo"
					note="Drop 03-drone-fieldwork.jpg here"
				/>
			</div>

		{:else if slideId === 'sensors'}
			<section class="hero-card right">
				<div class="eyebrow">MULTISENSOR EVIDENCE</div>
				<h2>Many sensors.<br />One hidden site.</h2>
				<p>Each image layer captures a different physical clue: surface context, micro-topography, vegetation stress, and heat retention.</p>
			</section>
			<div class="sensor-board">
				{#each sensorLayers as layer, i}
					<div class="sensor-card s{i}" style="--i: {i}">
						<div class="sensor-preview-slot">
							<ImageSlot
								src={layer.src}
								label={layer.label}
								note={layer.note}
								aspect="1 / 1"
								variant="sensor"
							/>
						</div>
						<span>{layer.label}</span>
					</div>
				{/each}
			</div>

		{:else if slideId === 'bottleneck'}
			<section class="hero-card left">
				<div class="eyebrow">BOTTLENECK</div>
				<h2>Interpretation<br />does not scale.</h2>
				<p>Archaeologists compare layers, mark anomalies, assign confidence, and decide whether a signal may be archaeologically meaningful.</p>
			</section>
			<div class="anomaly-ledger">
				<div class="anomaly-figure">
					<ImageSlot
						src={imageSlots.allAnomalies}
						label="All identified anomalies"
						note="Drop 09-all-anomalies.jpg here"
						fit="contain"
					/>
				</div>
				<div class="ledger-title"><span>55</span> documented anomalies</div>
				{#each ['stone tower / castle walls', 'moat outline', 'possible secondary moat', 'collapsed wall debris', 'post-depositional disturbance'] as item, i}
					<div class="ledger-row" style="--i: {i}">
						<span class="row-id">0{i + 1}</span>
						<span>{item}</span>
						<strong>{i < 2 ? 'high' : 'review'}</strong>
					</div>
				{/each}
			</div>

		{:else if slideId === 'droneml'}
			<section class="hero-card center">
				<div class="eyebrow">LIGHTWEIGHT DEMO</div>
				<h2>Toggle layers,<br />not heavy processing.</h2>
				<p>The three georeferenced PNG layers provide the visual base; the top probability raster adds numeric anomaly predictions on hover.</p>
			</section>
			<div class="method-diagram">
				<div class="method-node data">LiDAR · NDVI<br />thermal · probability</div>
				<div class="method-arrow"></div>
				<div class="method-node engine">map layer<br />stack</div>
				<div class="method-arrow"></div>
				<div class="method-node result">candidate<br />signals</div>
			</div>

		{:else if slideId === 'ml'}
			<section class="hero-card left wide">
				<div class="eyebrow">VISUAL LAYER COMPARISON</div>
				<h2>Fast toggling keeps<br />the expert in the loop.</h2>
				<p>Buried remains become legible when LiDAR, multispectral, thermal, and probability views are compared together.</p>
			</section>
			<div class="ml-output-preview">
				<ImageSlot
					src={imageSlots.lidar}
					label="LiDAR map layer"
					note="Local 1:1 image layer"
					aspect="1 / 1"
					fit="contain"
				/>
			</div>
			<div class="ml-pipeline">
				{#each ['LiDAR micro-relief', 'NDVI vegetation stress', 'thermal inertia', 'probability hover'] as step, i}
					<div class="pipe-step" style="--i: {i}">{step}</div>
					{#if i < 3}<div class="pipe-line" style="--i: {i}"></div>{/if}
				{/each}
			</div>

		{:else if slideId === 'software'}
			<section class="hero-card right">
				<div class="eyebrow">OPEN SOFTWARE OUTPUT</div>
				<h2>CoeusAI<br />and Pycoeus.</h2>
				<p>CoeusAI makes the workflow usable in QGIS. Pycoeus makes the analytical core reusable in scripts, services, and pipelines.</p>
			</section>
			<div class="software-screens">
				<div class="software-shot primary">
					<ImageSlot
						src={imageSlots.coeus}
						fallbackSrc={articleImages.coeus}
						label="CoeusAI probability output"
						note="Drop 10-coeus-probability.png here"
						fit="contain"
					/>
				</div>
				<div class="software-shot secondary">
					<ImageSlot
						src={imageSlots.qgis}
						fallbackSrc={articleImages.qgis}
						label="CoeusAI QGIS interface"
						note="Drop 11-coeus-qgis.jpg here"
						fit="contain"
					/>
				</div>
			</div>

		{:else if slideId === 'atlas'}
			<section class="hero-card left">
				<div class="eyebrow">DRONEATLAS PLATFORM</div>
				<h2>The layer workflow<br />as a research environment.</h2>
				<p>Researchers work with projects, areas, metadata, visual layers, maps, and interpretation targets in one polished platform.</p>
			</section>
			<div class="platform-window">
				<div class="window-bar"><span></span><span></span><span></span><strong>DroneATLAS</strong></div>
				<div class="sidebar-mock">
					<b>Collections</b>
					<span>Weesp castle site</span>
					<span>Sensor layers</span>
					<span>ML runs</span>
				</div>
				<div class="map-mock">
					<ImageSlot
						src={imageSlots.platform}
						label="DroneATLAS platform screenshot"
						note="Drop 12-droneatlas-platform.jpg here"
					/>
					<div class="site-box"></div><div class="heat"></div>
				</div>
			</div>

		{:else if slideId === 'process'}
			<section class="hero-card right">
				<div class="eyebrow">PLATFORM WORKFLOW</div>
				<h2>Drop, stack,<br />compare.</h2>
				<p>Drone imagery moves through organization, map placement, opacity control, and visual inspection.</p>
			</section>
			<div class="process-shot">
				<ImageSlot
					src={imageSlots.process}
					label="Drag/drop process screenshot"
					note="Drop 13-drag-drop-process.jpg here"
				/>
			</div>
			<div class="process-flow">
				{#each processSteps as step, i}
					<div class="process-step" class:active={p > i * 0.2} style="--i: {i}">{step}</div>
				{/each}
			</div>

		{:else if slideId === 'explore'}
			<section class="cinema-caption left-bottom">
				<div class="eyebrow">LIVE EXPLORATION</div>
				<h2>The map becomes<br />the workspace.</h2>
				<p>Now the workflow turns into spatial evidence: drone path, sensor layers, and site context.</p>
			</section>

		{:else if slideId === 'insight'}
			<section class="cinema-caption right-bottom">
				<div class="eyebrow">LAYER INSIGHT</div>
				<h2>Signals become<br />archaeological focus.</h2>
				<p>The visual stack shows where multiple sensor clues align. Expert interpretation remains decisive.</p>
			</section>
		{/if}
	</div>
{/if}

<style>
	.z-25 {
		z-index: 25;
	}
	.narrative {
		font-family: 'Inter', system-ui, sans-serif;
		color: white;
		overflow: hidden;
	}
	.grain {
		position: absolute;
		inset: 0;
		opacity: 0.07;
		background-image: radial-gradient(circle at 20% 20%, white 0 1px, transparent 1px),
			radial-gradient(circle at 80% 30%, white 0 1px, transparent 1px);
		background-size: 34px 34px, 47px 47px;
		mix-blend-mode: screen;
	}
	.hero-card,
	.cinema-caption {
		position: absolute;
		padding: 30px 34px;
		background: linear-gradient(135deg, rgba(5, 9, 16, 0.82), rgba(5, 9, 16, 0.38));
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 28px;
		backdrop-filter: blur(18px);
		box-shadow: 0 28px 80px rgba(0, 0, 0, 0.38);
		transform: translateY(calc((1 - var(--p)) * 16px));
		opacity: min(1, calc(var(--p) * 4));
	}
	.hero-card {
		top: 16vh;
		max-width: 560px;
	}
	.hero-card.left {
		left: 6vw;
	}
	.hero-card.right {
		right: 6vw;
	}
	.hero-card.center {
		left: 50%;
		transform: translateX(-50%) translateY(calc((1 - var(--p)) * 16px));
		text-align: center;
	}
	.hero-card.wide {
		max-width: 700px;
	}
	.hero-card.compact-top {
		top: 10vh;
		max-width: 820px;
	}
	.cinema-caption {
		max-width: 460px;
	}
	.left-bottom {
		left: 6vw;
		bottom: 12vh;
	}
	.right-bottom {
		right: 6vw;
		bottom: 12vh;
	}
	.eyebrow {
		font-size: 11px;
		letter-spacing: 0.34em;
		color: #39d2ff;
		margin-bottom: 14px;
		font-weight: 750;
	}
	h1,
	h2 {
		margin: 0;
		font-weight: 330;
		letter-spacing: -0.055em;
		line-height: 0.98;
	}
	h1 {
		font-size: clamp(56px, 8vw, 112px);
	}
	h2 {
		font-size: clamp(34px, 4.8vw, 70px);
	}
	p {
		font-size: 18px;
		line-height: 1.5;
		color: rgba(255, 255, 255, 0.82);
		margin: 18px 0 0;
	}
	.opening-lines {
		margin-top: 28px;
		display: grid;
		gap: 10px;
	}
	.opening-lines p {
		margin: 0;
		font-size: clamp(18px, 1.8vw, 26px);
		opacity: min(1, max(0, calc((var(--p) - var(--i) * 0.08) * 16)));
	}
	.story-photos {
		position: absolute;
		right: 7vw;
		bottom: 12vh;
		width: min(38vw, 560px);
		height: 52vh;
	}
	.story-field :global(.image-slot),
	.image-pair :global(.image-slot),
	.software-shot :global(.image-slot),
	.ml-output-preview :global(.image-slot),
	.process-shot :global(.image-slot) {
		width: 100%;
		height: 100%;
	}
	.story-field {
		position: absolute;
		inset: 12% 0 0 12%;
		width: 78%;
		height: 70%;
		opacity: min(1, max(0, calc((var(--p) - 0.08) * 12)));
	}
	.photo.historical {
		position: absolute;
		left: 0;
		top: 0;
		width: 46%;
		height: 38%;
		background: transparent;
		border-radius: 20px;
		color: #1b1b1b;
		padding: 0;
		transform: rotate(-4deg);
		opacity: min(1, calc(var(--p) * 5));
	}
	.trace-outline {
		position: absolute;
		right: 9%;
		bottom: 10%;
		width: 58%;
		height: 36%;
		border: 4px solid rgba(255, 190, 70, 0.9);
		border-left-width: 8px;
		transform: perspective(900px) rotateX(62deg) rotateZ(-14deg);
		box-shadow: 0 0 32px rgba(255, 190, 70, 0.55);
		opacity: min(1, max(0, calc((var(--p) - 0.28) * 10)));
	}
	.partner-grid {
		position: absolute;
		left: 7vw;
		right: 7vw;
		bottom: 12vh;
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 16px;
	}
	.partner-card,
	.sensor-card,
	.ledger-row,
	.pipe-step,
	.process-step {
		opacity: min(1, max(0, calc((var(--p) - var(--i) * 0.045) * 16)));
	}
	.partner-card {
		padding: 20px;
		min-height: 110px;
		background: rgba(6, 12, 22, 0.72);
		border: 1px solid rgba(57, 210, 255, 0.22);
		border-radius: 22px;
	}
	.partner-card strong,
	.partner-card span {
		display: block;
	}
	.partner-card strong {
		font-size: 18px;
		margin-bottom: 10px;
	}
	.partner-card span {
		color: rgba(255, 255, 255, 0.68);
		line-height: 1.4;
	}
	.metric-row {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 12px;
		margin-top: 24px;
	}
	.metric-row div {
		padding: 14px;
		border-radius: 18px;
		background: rgba(57, 210, 255, 0.09);
		border: 1px solid rgba(57, 210, 255, 0.2);
	}
	.metric-row strong,
	.metric-row span {
		display: block;
	}
	.metric-row strong {
		font-size: 34px;
		color: #ffb84d;
	}
	.metric-row span {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: rgba(255, 255, 255, 0.65);
	}
	.image-pair {
		position: absolute;
		top: 14vh;
		width: min(42vw, 620px);
		height: 62vh;
		display: grid;
		grid-template-columns: 1fr 0.82fr;
		gap: 16px;
	}
	.image-pair.right {
		right: 6vw;
	}
	.image-pair > :global(.image-slot):first-child {
		transform: translateY(5vh);
	}
	.image-pair > :global(.image-slot):last-child {
		transform: translateY(-2vh);
	}
	.sensor-board {
		position: absolute;
		left: 7vw;
		bottom: 11vh;
		width: min(48vw, 720px);
		height: 55vh;
		perspective: 1000px;
	}
	.sensor-card {
		position: absolute;
		left: calc(var(--i) * 7%);
		top: calc(var(--i) * 12%);
		width: 74%;
		height: 32%;
		padding: 14px;
		background: rgba(7, 13, 22, 0.7);
		border: 1px solid rgba(255, 255, 255, 0.14);
		border-radius: 20px;
		transform: rotateX(58deg) rotateZ(-12deg);
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.34);
	}
	.sensor-card span {
		position: absolute;
		left: 18px;
		bottom: 14px;
		font-size: 12px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
	}
	.sensor-preview-slot {
		position: absolute;
		inset: 14px;
		border-radius: 14px;
		overflow: hidden;
	}
	.sensor-preview-slot :global(.image-slot) {
		width: 100%;
		height: 100%;
	}
	.anomaly-ledger {
		position: absolute;
		right: 7vw;
		top: 17vh;
		width: min(42vw, 620px);
		padding: 24px;
		border-radius: 28px;
		background: rgba(5, 10, 18, 0.74);
		border: 1px solid rgba(255, 255, 255, 0.12);
		backdrop-filter: blur(14px);
	}
	.anomaly-figure {
		height: 210px;
		margin-bottom: 18px;
	}
	.anomaly-figure :global(.image-slot) {
		width: 100%;
		height: 100%;
	}
	.ledger-title {
		font-size: 24px;
		margin-bottom: 18px;
	}
	.ledger-title span {
		font-size: 74px;
		line-height: 1;
		color: #ffb84d;
		font-weight: 300;
		margin-right: 12px;
	}
	.ledger-row {
		display: grid;
		grid-template-columns: 54px 1fr auto;
		gap: 12px;
		align-items: center;
		padding: 13px 0;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
		font-size: 15px;
	}
	.row-id {
		color: #39d2ff;
		font-variant-numeric: tabular-nums;
	}
	.ledger-row strong {
		font-size: 11px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
		color: #ffb84d;
	}
	.method-diagram,
	.ml-pipeline,
	.process-flow {
		position: absolute;
		left: 50%;
		bottom: 14vh;
		transform: translateX(-50%);
		display: flex;
		align-items: center;
		gap: 18px;
	}
	.method-node,
	.pipe-step,
	.process-step {
		min-width: 170px;
		min-height: 110px;
		display: grid;
		place-items: center;
		text-align: center;
		padding: 18px;
		border-radius: 24px;
		background: rgba(8, 15, 25, 0.8);
		border: 1px solid rgba(57, 210, 255, 0.24);
		font-size: 16px;
		line-height: 1.25;
		box-shadow: 0 20px 70px rgba(0, 0, 0, 0.32);
	}
	.method-node.engine,
	.process-step.active {
		border-color: rgba(255, 184, 77, 0.7);
		box-shadow: 0 0 36px rgba(255, 184, 77, 0.18);
	}
	.method-arrow,
	.pipe-line {
		width: 64px;
		height: 2px;
		background: linear-gradient(90deg, #39d2ff, #ffb84d);
		box-shadow: 0 0 16px rgba(57, 210, 255, 0.4);
	}
	.ml-pipeline {
		right: 6vw;
		left: auto;
		bottom: 18vh;
		transform: none;
		width: min(48vw, 760px);
		justify-content: flex-end;
		flex-wrap: wrap;
	}
	.pipe-step {
		min-width: 155px;
		min-height: 92px;
		font-size: 14px;
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}
	.pipe-line {
		width: 34px;
	}
	.ml-output-preview {
		position: absolute;
		right: 7vw;
		bottom: 11vh;
		width: min(42vw, 620px);
		height: 30vh;
		opacity: min(1, max(0, calc((var(--p) - 0.08) * 12)));
	}
	.software-screens {
		position: absolute;
		left: 6vw;
		top: 16vh;
		width: min(48vw, 740px);
		height: 62vh;
	}
	.software-shot {
		position: absolute;
	}
	.software-shot.primary {
		left: 0;
		top: 10%;
		width: 72%;
		height: 52%;
	}
	.software-shot.secondary {
		right: 0;
		bottom: 0;
		width: 68%;
		height: 50%;
	}
	.platform-window {
		position: absolute;
		right: 6vw;
		top: 14vh;
		width: min(48vw, 760px);
		height: 62vh;
		border-radius: 28px;
		background: rgba(8, 14, 22, 0.88);
		border: 1px solid rgba(255, 255, 255, 0.16);
		box-shadow: 0 36px 100px rgba(0, 0, 0, 0.46);
		overflow: hidden;
		opacity: min(1, max(0, calc((var(--p) - 0.06) * 12)));
	}
	.window-bar {
		height: 46px;
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 0 18px;
		background: rgba(255, 255, 255, 0.06);
	}
	.window-bar span {
		width: 10px;
		height: 10px;
		border-radius: 999px;
		background: #39d2ff;
	}
	.window-bar strong {
		margin-left: 10px;
		letter-spacing: 0.2em;
		font-size: 12px;
	}
	.sidebar-mock {
		position: absolute;
		left: 0;
		top: 46px;
		bottom: 0;
		width: 220px;
		padding: 24px;
		background: rgba(255, 255, 255, 0.04);
		display: grid;
		align-content: start;
		gap: 16px;
	}
	.sidebar-mock span {
		padding: 12px;
		border-radius: 14px;
		background: rgba(57, 210, 255, 0.08);
		color: rgba(255, 255, 255, 0.72);
	}
	.map-mock {
		position: absolute;
		left: 220px;
		top: 46px;
		right: 0;
		bottom: 0;
		background: linear-gradient(135deg, #233923, #5f7942 55%, #243827);
	}
	.map-mock :global(.image-slot) {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
		border: 0;
		border-radius: 0;
		box-shadow: none;
	}
	.site-box {
		position: absolute;
		left: 28%;
		top: 30%;
		width: 44%;
		height: 32%;
		border: 2px solid rgba(255, 255, 255, 0.7);
		transform: rotate(-12deg);
	}
	.heat {
		position: absolute;
		left: 38%;
		top: 39%;
		width: 28%;
		height: 18%;
		border-radius: 50%;
		background: radial-gradient(ellipse, rgba(255, 235, 60, 0.85), rgba(255, 85, 120, 0.45), transparent 70%);
		filter: blur(8px);
	}
	.process-flow {
		left: 7vw;
		bottom: 14vh;
		transform: none;
		width: min(48vw, 760px);
		justify-content: flex-start;
		flex-wrap: wrap;
	}
	.process-step {
		min-height: 86px;
		font-size: 14px;
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}
	.process-shot {
		position: absolute;
		left: 7vw;
		top: 16vh;
		width: min(44vw, 680px);
		height: 34vh;
		opacity: min(1, max(0, calc((var(--p) - 0.06) * 12)));
	}
	@media (max-width: 900px) {
		.hero-card,
		.cinema-caption {
			left: 5vw !important;
			right: 5vw !important;
			top: 12vh;
			max-width: none;
		}
		.story-photos,
		.image-pair,
		.sensor-board,
		.anomaly-ledger,
		.software-screens,
		.platform-window,
		.partner-grid,
		.method-diagram,
		.ml-pipeline,
		.process-flow {
			display: none;
		}
	}
</style>
