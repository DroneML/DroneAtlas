<script lang="ts">
	import { fade } from 'svelte/transition';
	export let visible: boolean = true;
	export let progress: number = 0; // 0..1 within beat, used to fade out
</script>

{#if visible}
	<div class="cold-open absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
		style="opacity: {1 - Math.max(0, progress - 0.7) / 0.3}">
		<div class="bg"></div>
		<div class="text-center px-8" in:fade={{ duration: 1200 }}>
			<div class="kicker">DRONEATLAS · NETHERLANDS eSCIENCE CENTER</div>
			<h1 class="hero">
				What if a single flight<br />could map the unseen?
			</h1>
			<div class="scan-line"></div>
		</div>
	</div>
{/if}

<style>
	.cold-open {
		color: white;
		font-family: 'Inter', system-ui, sans-serif;
	}
	.bg {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, rgba(8, 18, 30, 0.85) 0%, rgba(0, 0, 0, 0.98) 70%);
	}
	.kicker {
		font-size: 11px;
		letter-spacing: 0.4em;
		opacity: 0.6;
		margin-bottom: 24px;
		position: relative;
	}
	.hero {
		font-size: clamp(32px, 5vw, 56px);
		font-weight: 300;
		line-height: 1.15;
		letter-spacing: -0.01em;
		position: relative;
	}
	.scan-line {
		margin-top: 32px;
		height: 1px;
		background: linear-gradient(90deg, transparent, #39d2ff, transparent);
		animation: scan 3s ease-in-out infinite;
	}
	@keyframes scan {
		0%,
		100% {
			opacity: 0.2;
		}
		50% {
			opacity: 1;
		}
	}
</style>
