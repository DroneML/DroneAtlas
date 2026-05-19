<script lang="ts">
	export let src: string = '';
	export let fallbackSrc: string = '';
	export let label: string = 'Image placeholder';
	export let note: string = '';
	export let aspect: string = '16 / 10';
	export let fit: 'cover' | 'contain' = 'cover';
	export let variant: 'dark' | 'paper' | 'sensor' = 'dark';

	let currentSrc = src || fallbackSrc;
	let missing = !currentSrc;
	let triedFallback = !src && !!fallbackSrc;
	let lastSrc = src;
	let lastFallbackSrc = fallbackSrc;

	$: if (src !== lastSrc || fallbackSrc !== lastFallbackSrc) {
		lastSrc = src;
		lastFallbackSrc = fallbackSrc;
		currentSrc = src || fallbackSrc;
		missing = !currentSrc;
		triedFallback = !src && !!fallbackSrc;
	}

	function handleError() {
		if (!triedFallback && fallbackSrc) {
			triedFallback = true;
			currentSrc = fallbackSrc;
			return;
		}
		missing = true;
	}
</script>

<div class="image-slot {variant}" class:missing style="--aspect: {aspect}">
	{#if currentSrc && !missing}
		<img src={currentSrc} alt={label} style="object-fit: {fit}" on:error={handleError} />
	{/if}
	{#if missing}
		<div class="placeholder">
			<div class="placeholder-icon"></div>
			<strong>{label}</strong>
			{#if note}<span>{note}</span>{/if}
		</div>
	{/if}
</div>

<style>
	.image-slot {
		position: relative;
		width: 100%;
		height: 100%;
		aspect-ratio: var(--aspect);
		border-radius: 24px;
		overflow: hidden;
		background: rgba(7, 13, 22, 0.76);
		border: 1px solid rgba(255, 255, 255, 0.16);
		box-shadow: 0 24px 80px rgba(0, 0, 0, 0.38);
	}
	.image-slot img {
		position: absolute;
		inset: 0;
		width: 100%;
		height: 100%;
	}
	.image-slot::after {
		content: '';
		position: absolute;
		inset: 0;
		background: linear-gradient(180deg, transparent 55%, rgba(0, 0, 0, 0.28));
		pointer-events: none;
	}
	.placeholder {
		position: absolute;
		inset: 0;
		display: grid;
		place-content: center;
		gap: 10px;
		padding: 24px;
		text-align: center;
		background:
			linear-gradient(135deg, rgba(57, 210, 255, 0.08), rgba(255, 184, 77, 0.06)),
			repeating-linear-gradient(
				-45deg,
				rgba(255, 255, 255, 0.04) 0 1px,
				transparent 1px 16px
			);
	}
	.placeholder-icon {
		justify-self: center;
		width: 54px;
		height: 40px;
		border: 2px solid rgba(57, 210, 255, 0.6);
		border-radius: 10px;
		position: relative;
	}
	.placeholder-icon::before,
	.placeholder-icon::after {
		content: '';
		position: absolute;
		background: rgba(255, 184, 77, 0.85);
	}
	.placeholder-icon::before {
		width: 9px;
		height: 9px;
		border-radius: 999px;
		right: 8px;
		top: 7px;
	}
	.placeholder-icon::after {
		left: 8px;
		bottom: 8px;
		width: 34px;
		height: 16px;
		clip-path: polygon(0 100%, 38% 25%, 58% 62%, 76% 35%, 100% 100%);
	}
	.placeholder strong {
		font-size: 13px;
		letter-spacing: 0.16em;
		line-height: 1.35;
		text-transform: uppercase;
		color: white;
	}
	.placeholder span {
		font-size: 11px;
		line-height: 1.45;
		color: rgba(255, 255, 255, 0.64);
	}
	.paper {
		background: #f1e8d1;
		color: #171717;
		border-color: rgba(0, 0, 0, 0.14);
	}
	.paper .placeholder {
		background:
			linear-gradient(135deg, rgba(0, 0, 0, 0.04), rgba(120, 75, 20, 0.08)),
			repeating-linear-gradient(-45deg, rgba(0, 0, 0, 0.04) 0 1px, transparent 1px 16px);
	}
	.paper .placeholder strong {
		color: #1a1a1a;
	}
	.paper .placeholder span {
		color: rgba(0, 0, 0, 0.62);
	}
	.sensor {
		border-radius: 14px;
		box-shadow: none;
	}
	.sensor .placeholder {
		padding: 12px;
	}
	.sensor .placeholder-icon {
		width: 38px;
		height: 28px;
	}
	.sensor .placeholder strong {
		font-size: 9px;
		letter-spacing: 0.12em;
	}
	.sensor .placeholder span {
		display: none;
	}
</style>
