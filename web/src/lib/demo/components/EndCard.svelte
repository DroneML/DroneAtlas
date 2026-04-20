<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	export let visible: boolean = false;
	export let stats: { label: string; value: string }[] = [];
</script>

{#if visible}
	<div class="absolute inset-0 z-30 flex items-center justify-center pointer-events-none" in:fade={{ duration: 600 }}>
		<div class="bg"></div>
		<div class="content text-center px-8">
			<div class="kicker" in:fly={{ y: -10, duration: 600, delay: 200, easing: cubicOut }}>
				MISSION COMPLETE
			</div>
			<h1 class="hero" in:fly={{ y: 10, duration: 700, delay: 400, easing: cubicOut }}>
				One flight.<br />Many discoveries.
			</h1>
			<div class="stats-row" in:fade={{ duration: 600, delay: 800 }}>
				{#each stats as s}
					<div class="stat">
						<div class="val">{s.value}</div>
						<div class="lbl">{s.label}</div>
					</div>
				{/each}
			</div>
			<div class="footer" in:fade={{ duration: 500, delay: 1400 }}>
				droneatlas.org · Netherlands eScience Center × UvA 4D Research Lab
			</div>
		</div>
	</div>
{/if}

<style>
	.bg {
		position: absolute;
		inset: 0;
		background: radial-gradient(ellipse at center, rgba(8, 18, 30, 0.7) 0%, rgba(0, 0, 0, 0.95) 70%);
	}
	.content {
		position: relative;
		color: white;
		font-family: 'Inter', system-ui, sans-serif;
	}
	.kicker {
		font-size: 11px;
		letter-spacing: 0.4em;
		opacity: 0.6;
		margin-bottom: 18px;
		color: #39d2ff;
	}
	.hero {
		font-size: clamp(36px, 5.5vw, 64px);
		font-weight: 300;
		line-height: 1.1;
		margin-bottom: 48px;
	}
	.stats-row {
		display: flex;
		gap: 56px;
		justify-content: center;
		margin-bottom: 40px;
	}
	.stat .val {
		font-size: 40px;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		background: linear-gradient(180deg, #fff 0%, #39d2ff 100%);
		-webkit-background-clip: text;
		background-clip: text;
		color: transparent;
	}
	.stat .lbl {
		font-size: 10px;
		letter-spacing: 0.3em;
		opacity: 0.6;
		margin-top: 4px;
	}
	.footer {
		font-size: 11px;
		letter-spacing: 0.2em;
		opacity: 0.5;
	}
</style>
