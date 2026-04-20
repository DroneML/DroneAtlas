<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { cubicOut } from 'svelte/easing';
	import type { Sensor } from '../types';
	export let sensors: Sensor[] = [];
</script>

<div class="sensor-stack absolute right-6 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-2 pointer-events-none">
	{#each sensors as s (s.id)}
		{#if s.active}
			<div
				in:fly={{ x: 40, duration: 500, easing: cubicOut }}
				out:fade={{ duration: 200 }}
				class="sensor-chip"
				style="border-color: {s.color}; box-shadow: 0 0 16px {s.color}55"
			>
				<span class="dot" style="background: {s.color}"></span>
				<span class="label">{s.label}</span>
				<span class="status">ACTIVE</span>
			</div>
		{/if}
	{/each}
</div>

<style>
	.sensor-chip {
		display: flex;
		align-items: center;
		gap: 10px;
		padding: 10px 14px;
		background: rgba(8, 14, 22, 0.7);
		backdrop-filter: blur(8px);
		border: 1px solid;
		border-radius: 8px;
		color: white;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 13px;
		min-width: 200px;
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
	}
	.label {
		flex: 1;
		font-weight: 500;
		letter-spacing: 0.05em;
	}
	.status {
		font-size: 9px;
		letter-spacing: 0.2em;
		opacity: 0.7;
	}
</style>
