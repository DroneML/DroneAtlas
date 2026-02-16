<script lang="ts">
	import '$lib/assets/css/app.css';
	import '$lib/assets/css/code-highlighted-prisma.css';
	import Header from '$components/ui/Header.svelte';
	// import Analytics from '$components/ui/Analytics.svelte';
	import SideMenu from '$components/ui/SideMenu.svelte';
	import GlobalToast from '$components/ui/GlobalToast.svelte';
	import { page } from '$app/stores';
	import { browser, dev } from '$app/environment';

	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();

	// Check if embed parameter is present in URL
	let isEmbedded = $derived(browser && $page.url.searchParams.get('embed') === 'true');
</script>

<!-- <Analytics /> -->
<GlobalToast />

<svelte:head>
	<title>{dev ? 'DEV - ' : ''}DroneAtlas</title>
</svelte:head>

<div
	class="relative grid h-dvh w-dvw {isEmbedded
		? 'grid-rows-[1fr]'
		: 'grid-rows-[auto_auto_1fr] sm:grid-rows-[auto_1fr]'} overflow-clip"
>
	{#if !isEmbedded}
		<Header />
		<SideMenu />
	{/if}
	{#if children}{@render children()}{:else}
		<!-- Content here -->
	{/if}
</div>
