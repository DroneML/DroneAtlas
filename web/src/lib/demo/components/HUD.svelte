<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';

	export let slideTitle: string = '';
	export let subtitle: string = '';
	export let caption: string = '';
	export let altitude: number = 0;
	export let speed: number = 0;
	export let coverageKm2: number = 0;
	export let detections: number = 0;
	export let showTelemetry: boolean = true;
</script>

<div class="hud-root pointer-events-none absolute inset-0 z-20 text-white">
	<!-- Top-left: branding + slide title -->
	<div class="absolute left-6 top-6 flex flex-col gap-2">
		<div class="brand">
			<span class="logo-dot"></span>
			<span class="brand-name">
				DRONE
				<span class="brand-accent">ATLAS</span>
			</span>
		</div>
		{#key slideTitle}
			<div in:fly={{ y: -8, duration: 400, easing: cubicOut }} class="slide-title">
				{slideTitle}
			</div>
		{/key}
		{#key subtitle}
			{#if subtitle}
				<div in:fade={{ duration: 400 }} class="slide-subtitle">{subtitle}</div>
			{/if}
		{/key}
	</div>

	<!-- Top-right: telemetry block (toggled per slide) -->
	{#if showTelemetry}
		<div
			class="telemetry absolute right-6 top-6"
			in:fade={{ duration: 300 }}
			out:fade={{ duration: 200 }}
		>
			<div class="tel-row">
				<span class="tel-label">ALT</span>
				<span class="tel-val">
					{altitude.toFixed(0)}
					<span class="tel-unit">m</span>
				</span>
			</div>
			<div class="tel-row">
				<span class="tel-label">SPD</span>
				<span class="tel-val">
					{speed.toFixed(1)}
					<span class="tel-unit">m/s</span>
				</span>
			</div>
			<div class="tel-row">
				<span class="tel-label">AREA</span>
				<span class="tel-val">
					{coverageKm2.toFixed(2)}
					<span class="tel-unit">km²</span>
				</span>
			</div>
			<div class="tel-row">
				<span class="tel-label">DET</span>
				<span class="tel-val">{detections}</span>
			</div>
		</div>
	{/if}

	<!-- Centre-bottom caption (above SlideNav) -->
	<div class="absolute inset-x-0 bottom-24 flex justify-center">
		{#key caption}
			{#if caption}
				<div in:fade={{ duration: 400 }} out:fade={{ duration: 200 }} class="caption">
					{caption}
				</div>
			{/if}
		{/key}
	</div>
</div>

<style>
	.hud-root {
		font-family: 'Inter', 'Helvetica Neue', system-ui, sans-serif;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
	}
	.brand {
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 12px;
		letter-spacing: 0.3em;
	}
	.logo-dot {
		width: 10px;
		height: 10px;
		background: #39d2ff;
		border-radius: 50%;
		box-shadow: 0 0 12px #39d2ff;
		animation: pulse 2s infinite;
	}
	.brand-name {
		font-weight: 700;
	}
	.brand-accent {
		color: #39d2ff;
	}
	.slide-title {
		font-size: 26px;
		font-weight: 600;
		letter-spacing: 0.04em;
		max-width: 460px;
		line-height: 1.15;
	}
	.slide-subtitle {
		font-size: 14px;
		letter-spacing: 0.08em;
		opacity: 0.8;
		font-weight: 400;
		max-width: 420px;
	}
	.telemetry {
		background: rgba(8, 14, 22, 0.55);
		backdrop-filter: blur(8px);
		border: 1px solid rgba(57, 210, 255, 0.25);
		border-radius: 12px;
		padding: 14px 18px;
		min-width: 180px;
		font-variant-numeric: tabular-nums;
	}
	.tel-row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 16px;
		padding: 4px 0;
		border-bottom: 1px solid rgba(255, 255, 255, 0.07);
	}
	.tel-row:last-child {
		border-bottom: none;
	}
	.tel-label {
		font-size: 10px;
		letter-spacing: 0.2em;
		opacity: 0.6;
	}
	.tel-val {
		font-size: 20px;
		font-weight: 600;
	}
	.tel-unit {
		font-size: 11px;
		opacity: 0.5;
		margin-left: 4px;
	}
	.caption {
		font-size: 24px;
		font-weight: 500;
		text-align: center;
		max-width: 760px;
		line-height: 1.3;
		padding: 12px 24px;
		background: linear-gradient(180deg, rgba(8, 14, 22, 0) 0%, rgba(8, 14, 22, 0.7) 100%);
		border-radius: 8px;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
			box-shadow: 0 0 12px #39d2ff;
		}
		50% {
			opacity: 0.6;
			box-shadow: 0 0 4px #39d2ff;
		}
	}
</style>
