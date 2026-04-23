<script lang="ts">
	import { fly, fade } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Detection } from '../types';
	export let detections: Detection[] = [];
</script>

<div class="pointer-events-none absolute left-6 top-1/2 z-20 flex -translate-y-1/2 flex-col gap-2">
	{#each detections as d (d.id)}
		{#if d.visible}
			<div
				in:fly={{ x: -40, duration: 500, easing: cubicOut }}
				out:fade={{ duration: 200 }}
				class="card"
				style="border-color: {d.color}; box-shadow: 0 0 16px {d.color}55"
			>
				<div class="mb-1 flex items-center gap-2">
					<span class="dot" style="background: {d.color}"></span>
					<span class="label">{d.label}</span>
				</div>
				<div class="conf-row">
					<span class="conf-label">CONFIDENCE</span>
					<span class="conf-val">{(d.confidence * 100).toFixed(1)}%</span>
				</div>
				<div class="conf-bar">
					<div class="conf-fill" style="width: {d.confidence * 100}%; background: {d.color}"></div>
				</div>
			</div>
		{/if}
	{/each}
</div>

<style>
	.card {
		padding: 12px 14px;
		background: rgba(8, 14, 22, 0.72);
		backdrop-filter: blur(8px);
		border: 1px solid;
		border-radius: 10px;
		color: white;
		font-family: 'Inter', system-ui, sans-serif;
		min-width: 240px;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.label {
		font-weight: 600;
		font-size: 13px;
		letter-spacing: 0.03em;
	}
	.conf-row {
		display: flex;
		justify-content: space-between;
		font-size: 10px;
		opacity: 0.7;
		letter-spacing: 0.15em;
		margin-top: 6px;
	}
	.conf-val {
		font-weight: 600;
		opacity: 1;
	}
	.conf-bar {
		margin-top: 4px;
		height: 3px;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 2px;
		overflow: hidden;
	}
	.conf-fill {
		height: 100%;
		transition: width 0.6s ease-out;
	}
</style>
