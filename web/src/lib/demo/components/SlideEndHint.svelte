<script lang="ts">
	import { fade } from 'svelte/transition';
	export let visible: boolean = false;
	export let atLastSlide: boolean = false;
</script>

{#if visible}
	<div
		class="hint pointer-events-none absolute bottom-24 right-6 z-30"
		in:fade={{ duration: 260 }}
		out:fade={{ duration: 150 }}
	>
		{#if atLastSlide}
			<span class="label">
				End of presentation · <kbd>R</kbd>
				to restart
			</span>
		{:else}
			<span class="arrow">→</span>
			<span class="label">
				Press <kbd>→</kbd>
				or click to continue
			</span>
		{/if}
	</div>
{/if}

<style>
	.hint {
		display: inline-flex;
		align-items: center;
		gap: 10px;
		padding: 10px 16px;
		background: rgba(8, 14, 22, 0.8);
		border: 1px solid rgba(57, 210, 255, 0.45);
		border-radius: 999px;
		color: white;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 12px;
		letter-spacing: 0.1em;
		box-shadow: 0 0 18px rgba(57, 210, 255, 0.2);
		animation: hint-pulse 2s ease-in-out infinite;
	}
	.arrow {
		font-size: 14px;
		color: #39d2ff;
	}
	.label {
		opacity: 0.92;
	}
	kbd {
		background: rgba(255, 255, 255, 0.12);
		border: 1px solid rgba(255, 255, 255, 0.25);
		border-radius: 3px;
		padding: 1px 6px;
		font-family: inherit;
		font-size: 11px;
		margin: 0 2px;
	}
	@keyframes hint-pulse {
		0%,
		100% {
			box-shadow: 0 0 18px rgba(57, 210, 255, 0.2);
		}
		50% {
			box-shadow: 0 0 26px rgba(57, 210, 255, 0.45);
		}
	}
</style>
