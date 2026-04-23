<script lang="ts">
	import { fade } from 'svelte/transition';
	export let visible: boolean = false;
	export let kicker: string = '';
	export let title: string = '';
	export let subtitle: string = '';
	export let variant: 'hero' | 'problem' = 'hero';
</script>

{#if visible}
	<div
		class="cold-open pointer-events-none absolute inset-0 z-30 flex items-center justify-center"
		in:fade={{ duration: 450 }}
		out:fade={{ duration: 250 }}
	>
		<div class="bg {variant}"></div>
		<div class="px-8 text-center" in:fade={{ duration: 800 }}>
			{#if kicker}
				<div class="kicker">{kicker}</div>
			{/if}
			<h1 class="hero {variant}">
				{@html title.replace(/\n/g, '<br />')}
			</h1>
			{#if subtitle}
				<div class="subtitle">{subtitle}</div>
			{/if}
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
	}
	.bg.hero {
		background: radial-gradient(
			ellipse at center,
			rgba(8, 18, 30, 0.9) 0%,
			rgba(0, 0, 0, 0.99) 70%
		);
	}
	.bg.problem {
		background: radial-gradient(
			ellipse at center,
			rgba(30, 8, 40, 0.85) 0%,
			rgba(0, 0, 0, 0.96) 70%
		);
	}
	.kicker {
		font-size: 11px;
		letter-spacing: 0.4em;
		opacity: 0.6;
		margin-bottom: 24px;
		position: relative;
	}
	.hero {
		font-size: clamp(40px, 6vw, 72px);
		font-weight: 300;
		line-height: 1.1;
		letter-spacing: -0.01em;
		position: relative;
	}
	.hero.problem {
		font-size: clamp(28px, 4.5vw, 48px);
		font-weight: 400;
	}
	.subtitle {
		margin-top: 20px;
		font-size: clamp(14px, 1.6vw, 18px);
		letter-spacing: 0.1em;
		opacity: 0.75;
		max-width: 680px;
		margin-left: auto;
		margin-right: auto;
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
