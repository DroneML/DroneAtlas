<script lang="ts">
	import type { Map as MaplibreMap } from 'maplibre-gl';
	import {
		MapStyleCategory,
		getStylesByCategory,
		type MapStyle
	} from '../MapStyles';
	import { selectedMapStyle } from '$lib/stores/mapStyle.store';
	import { setMapStyle } from '../utils/MapStyleManager';
	import { selectedLocation } from '$lib/stores/projects.store';

	// Props
	export let map: MaplibreMap | null = null;
	export let position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-right';

	// Get styles by category
	let stylesByCategory = getStylesByCategory();

	// Handle style selection
	function handleStyleSelect(style: MapStyle) {
		if (map) {
			setMapStyle(map, style);
		}
	}

	// Generate position classes with higher z-index
	$: positionClasses = {
		'top-left': 'absolute left-24 top-24 z-50',
		'top-right': 'absolute right-4 top-24 z-50',
		'bottom-left': 'absolute left-24 bottom-12 z-50',
		'bottom-right': 'absolute right-4 bottom-12 z-50'
	}[position];
</script>

<div class="map-controls {positionClasses} {$selectedLocation ? 'selected-location-open' : ''}">
	<div class="tool-cluster">
		<button class="tool-button" type="button" title="Zoom in" onclick={() => map?.zoomIn()}>
			+
		</button>
		<button class="tool-button" type="button" title="Zoom out" onclick={() => map?.zoomOut()}>
			-
		</button>
		<button class="tool-button" type="button" title="Reset bearing" onclick={() => map?.resetNorthPitch()}>
			<svg viewBox="0 0 24 24" aria-hidden="true">
				<path d="M12 3l5 18-5-3-5 3 5-18z" />
			</svg>
		</button>

		<div class="dropdown dropdown-bottom dropdown-end">
			<button type="button" class="tool-button style-button" title="Map style">
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 3 3 8l9 5 9-5-9-5Zm-7.3 8.1L3 12l9 5 9-5-1.7-.9L12 15 4.7 11.1Zm0 4L3 16l9 5 9-5-1.7-.9L12 19 4.7 15.1Z" />
				</svg>
			</button>
			<ul
				class="style-menu dropdown-content menu z-[60] max-h-[70vh] w-60 overflow-y-auto p-2 shadow"
			>
				{#each Object.values(MapStyleCategory) as category}
					<li class="menu-title">{category}</li>
					{#each stylesByCategory[category] as style}
						<li>
							<button
								class:active={$selectedMapStyle.id === style.id}
								onclick={() => handleStyleSelect(style)}
							>
								{style.name}
							</button>
						</li>
					{/each}
				{/each}
			</ul>
		</div>
	</div>
</div>

<style>
	.map-controls.selected-location-open {
		right: 392px;
	}

	.tool-cluster {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.tool-button {
		display: grid;
		place-items: center;
		width: 38px;
		height: 38px;
		border: 1px solid rgba(167, 213, 255, 0.18);
		border-radius: 12px;
		background: rgba(8, 13, 21, 0.74);
		box-shadow: 0 12px 28px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.08);
		backdrop-filter: blur(14px);
		color: rgba(234, 244, 255, 0.88);
		font-size: 19px;
		font-weight: 800;
		line-height: 1;
		transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
	}

	.tool-button:hover {
		transform: translateY(-1px);
		border-color: rgba(97, 216, 255, 0.46);
		background: rgba(28, 43, 63, 0.82);
	}

	.tool-button svg {
		width: 18px;
		height: 18px;
		fill: currentColor;
	}

	.style-button {
		cursor: pointer;
	}

	.style-menu {
		border: 1px solid rgba(167, 213, 255, 0.16);
		border-radius: 16px;
		background: rgba(8, 13, 21, 0.92);
		box-shadow: 0 24px 70px rgba(0, 0, 0, 0.45);
		backdrop-filter: blur(20px);
		color: rgba(234, 244, 255, 0.86);
	}

	.style-menu :global(.menu-title) {
		font-size: 10px;
		letter-spacing: 0.16em;
		text-transform: uppercase;
		color: rgba(97, 216, 255, 0.72);
	}

	:global(.menu li button.active) {
		background-color: rgba(97, 216, 255, 0.16);
		color: white;
	}

	@media (max-width: 1023px) {
		.map-controls,
		.map-controls.selected-location-open {
			right: 12px;
			top: 86px;
		}
	}

	@media (max-width: 640px) {
		.tool-button {
			width: 34px;
			height: 34px;
			border-radius: 10px;
		}
	}
</style>
