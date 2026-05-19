<script>
	import Map from '$lib/components/Map/Map.svelte';
</script>

<!-- Fix the height to ensure map is properly sized -->
<div class=" -mt-[80px]">
	<Map initialCenter={[5.5, 52.0]} initialZoom={7} />
</div>
