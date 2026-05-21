<script lang="ts">
	import Map from '$lib/components/Map/Map.svelte';
</script>

<svelte:head>
	<title>DroneAtlas - Spatial Intelligence</title>
</svelte:head>

<div class="relative h-dvh w-dvw overflow-hidden bg-[#05080d]">
	<Map initialCenter={[5.5, 52.0]} initialZoom={7} initialStyleId="osm-default" />
</div>
