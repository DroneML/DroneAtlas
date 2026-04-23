<script lang="ts">
	import type { Beat } from '../timeline';
	export let slides: Beat[] = [];
	export let current: number = 0;
	export let onJump: (idx: number) => void = () => {};
	export let onPrev: () => void = () => {};
	export let onNext: () => void = () => {};

	$: title = slides[current]?.title ?? '';
</script>

<div
	class="slide-nav pointer-events-auto absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3"
>
	<button class="nav-btn" on:click|stopPropagation={onPrev} aria-label="Previous slide">◀</button>
	<div class="counter">
		<span class="n">{current + 1}</span>
		<span class="sep">/</span>
		<span class="total">{slides.length}</span>
	</div>
	<div class="dots">
		{#each slides as s, i (s.id)}
			<button
				class="dot {i === current ? 'active' : ''}"
				on:click|stopPropagation={() => onJump(i)}
				aria-label="Slide {i + 1}: {s.title}"
			></button>
		{/each}
	</div>
	<div class="title" {title}>{title}</div>
	<button class="nav-btn" on:click|stopPropagation={onNext} aria-label="Next slide">▶</button>
</div>

<style>
	.slide-nav {
		background: rgba(8, 14, 22, 0.72);
		backdrop-filter: blur(10px);
		border: 1px solid rgba(57, 210, 255, 0.25);
		border-radius: 999px;
		padding: 8px 14px;
		font-family: 'Inter', system-ui, sans-serif;
		color: white;
		font-size: 12px;
		letter-spacing: 0.05em;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
	}
	.nav-btn {
		background: transparent;
		border: 1px solid rgba(255, 255, 255, 0.15);
		color: white;
		width: 30px;
		height: 30px;
		border-radius: 50%;
		cursor: pointer;
		font-size: 11px;
		transition: all 0.15s;
	}
	.nav-btn:hover {
		background: rgba(57, 210, 255, 0.2);
		border-color: #39d2ff;
	}
	.counter {
		font-variant-numeric: tabular-nums;
		padding: 0 6px;
		letter-spacing: 0.15em;
	}
	.counter .n {
		color: #39d2ff;
		font-weight: 600;
	}
	.counter .sep {
		opacity: 0.4;
		margin: 0 4px;
	}
	.counter .total {
		opacity: 0.7;
	}
	.dots {
		display: flex;
		gap: 6px;
		padding: 0 8px;
		border-left: 1px solid rgba(255, 255, 255, 0.1);
		border-right: 1px solid rgba(255, 255, 255, 0.1);
	}
	.dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.25);
		border: none;
		cursor: pointer;
		padding: 0;
		transition: all 0.15s;
	}
	.dot:hover {
		background: rgba(57, 210, 255, 0.6);
	}
	.dot.active {
		background: #39d2ff;
		box-shadow: 0 0 8px #39d2ff;
		transform: scale(1.25);
	}
	.title {
		max-width: 260px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		font-weight: 500;
		opacity: 0.85;
		padding: 0 8px;
	}
</style>
