<script lang="ts">
	import Logo from '$lib/assets/icons/Logo.svelte';
	import { onMount } from 'svelte';
	import { toggleMenu } from '$lib/stores/menu.store';
	import { base } from '$app/paths';
	import IconamoonMenuBurgerHorizontalBold from '~icons/iconamoon/menu-burger-horizontal-bold';
	import menuItems from '$lib/models/menu-itmes';

	let activeCategory = $state('Dashboard');
	let isDesktop = $state(true);

	onMount(() => {
		const mediaQuery = window.matchMedia('(min-width: 640px)');
		isDesktop = mediaQuery.matches;

		const handleMediaQueryChange = (e: MediaQueryListEvent) => {
			isDesktop = e.matches;
		};

		mediaQuery.addEventListener('change', handleMediaQueryChange);

		return () => {
			mediaQuery.removeEventListener('change', handleMediaQueryChange);
		};
	});
</script>

<nav id="header" class="bien-nav mb-10 px-3">
	<div class="bien-glass"></div>
	<div class="bien-glass-edge"></div>
	<div class="container relative mx-auto py-2">
		<!--Desktop Header-->
		<header class="flex items-center gap-3 px-2 sm:px-0">
			<button
				class="hover:bg-base-200 rounded-md p-2 transition-colors duration-200 sm:hidden"
				onclick={toggleMenu}
				aria-label="Open menu"
			>
				<IconamoonMenuBurgerHorizontalBold class="size-6" />
			</button>
			<div class="flex items-center gap-2">
				<a
					class="no-drag h-auto flex-initial flex-shrink-0 select-none"
					href="{base}/"
				>
					<Logo />
				</a>
				<a
					href="https://github.com/DroneML/DroneAtlas"
					target="_blank"
					rel="noopener noreferrer"
					class="text-base-content/60 hover:text-base-content transition-colors"
					aria-label="GitHub repository"
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
				</a>
			</div>
			<div class="flex-1"></div>
			<!-- Desktop menu -->
			<div class="z-10 w-full flex-1 justify-end space-x-4 sm:flex lg:space-x-8">
				{#each menuItems as link}
					{#if link.external}
						<a
							class="menu-link !no-underline"
							class:active={activeCategory === link.title}
							href={link.path}
							target="_blank"
							rel="noopener noreferrer"
						>
							{link.displayTitle}
						</a>
					{:else}
						<a
							class="menu-link"
							onclick={() => (activeCategory = link.title)}
							class:active={activeCategory === link.title}
							href="{base}{link.path}"
						>
							{link.displayTitle}
						</a>
					{/if}
				{/each}
			</div>
		</header>
	</div>
</nav>

<style lang="postcss">
	.menu-link {
		@apply text-base-content hover:text-secondary relative font-medium text-opacity-80 transition hover:text-opacity-100;
	}

	.menu-link.active {
		@apply text-base-content;
		border-bottom: 2px solid #ff6b35;
		padding-bottom: 2px;
	}

	/* Frosted navigation header */
	nav {
		z-index: 1000;
		position: sticky;
		left: 0;
		right: 0;
		top: 0;
	}

	/* Frosted Navigation bar */
	.bien-glass {
		position: absolute;
		inset: 0;
		--extended-by: 100px;
		--filter: blur(30px);
		--cutoff: calc(100% - var(--extended-by));

		bottom: calc(-1 * var(--extended-by));
		-webkit-backdrop-filter: var(--filter);
		backdrop-filter: var(--filter);
		pointer-events: none;

		-webkit-mask-image: linear-gradient(
			to bottom,
			black 0,
			black var(--cutoff),
			transparent var(--cutoff)
		);
	}

	.bien-glass-edge {
		position: absolute;
		z-index: -1;
		left: 0;
		right: 0;

		--extended-by: 80px;
		--offset: 20px;
		--thickness: 2px;
		height: calc(var(--extended-by) + var(--offset));
		top: calc(100% - var(--offset) + var(--thickness));

		--filter: blur(90px) saturate(160%) brightness(1.3);
		-webkit-backdrop-filter: var(--filter);
		backdrop-filter: var(--filter);
		pointer-events: none;

		-webkit-mask-image: linear-gradient(
			to bottom,
			black 0,
			black var(--offset),
			transparent var(--offset)
		);
	}
</style>
