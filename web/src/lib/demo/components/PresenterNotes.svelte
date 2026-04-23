<script lang="ts">
	import { fade } from 'svelte/transition';
	export let visible: boolean = false;
	export let title: string = '';
	export let note: string = '';
	export let slideNum: number = 0;
	export let totalSlides: number = 0;
</script>

{#if visible}
	<div class="presenter-notes" in:fade={{ duration: 200 }} out:fade={{ duration: 120 }}>
		<div class="head">
			<span class="kicker">PRESENTER NOTES</span>
			<span class="idx">{slideNum} / {totalSlides}</span>
		</div>
		<div class="title">{title}</div>
		<div class="body">{note}</div>
		<div class="foot">
			Press <kbd>N</kbd>
			to hide
		</div>
	</div>
{/if}

<style>
	.presenter-notes {
		position: absolute;
		left: 24px;
		bottom: 86px;
		z-index: 30;
		max-width: 420px;
		padding: 16px 20px;
		background: rgba(12, 18, 28, 0.92);
		border: 1px solid rgba(255, 208, 64, 0.45);
		border-radius: 12px;
		color: #ffe8a3;
		font-family: 'Inter', system-ui, sans-serif;
		font-size: 13px;
		line-height: 1.55;
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.5);
		backdrop-filter: blur(10px);
		pointer-events: none;
	}
	.head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8px;
	}
	.kicker {
		font-size: 10px;
		letter-spacing: 0.3em;
		color: #ffc938;
		font-weight: 600;
	}
	.idx {
		font-size: 10px;
		font-variant-numeric: tabular-nums;
		opacity: 0.6;
		letter-spacing: 0.15em;
	}
	.title {
		font-size: 15px;
		font-weight: 600;
		color: white;
		margin-bottom: 6px;
		letter-spacing: 0.02em;
	}
	.body {
		color: #e6d49a;
		font-weight: 400;
	}
	.foot {
		margin-top: 10px;
		font-size: 10px;
		opacity: 0.55;
		letter-spacing: 0.1em;
	}
	kbd {
		background: rgba(255, 255, 255, 0.1);
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 3px;
		padding: 1px 5px;
		font-family: inherit;
		font-size: 10px;
	}
</style>
