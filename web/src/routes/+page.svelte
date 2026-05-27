<script lang="ts">
	import Map from '$lib/components/Map/Map.svelte';
	import { WEESP_DEMO_CENTER } from '$lib/demo/weesp';
</script>

<svelte:head>
	<title>DroneAtlas - Spatial Intelligence</title>
</svelte:head>

<div class="relative h-dvh w-dvw overflow-hidden bg-[#05080d]">
	<Map initialCenter={WEESP_DEMO_CENTER} initialZoom={18.45} initialStyleId="hybrid" />
</div>
