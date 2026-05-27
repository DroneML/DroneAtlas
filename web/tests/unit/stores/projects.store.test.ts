import { beforeEach, describe, expect, test } from 'bun:test';
import { get } from 'svelte/store';
import {
	enabledProjectLayers,
	getLayerTypeColor,
	getLayerTypeIcon,
	projectLocations,
	selectLocation,
	selectedLocation,
	selectedLocationId,
	toggleProjectLayer,
	updateProjectLayerOpacity
} from '$lib/stores/projects.store';
import { rasterLayers } from '$lib/stores/raster.store';

describe('projects.store', () => {
	beforeEach(() => {
		selectedLocationId.set(null);
		enabledProjectLayers.set(new Set());
		rasterLayers.update((layers) => {
			for (const id of layers.keys()) {
				if (id.startsWith('project-')) layers.delete(id);
			}
			return new Map(layers);
		});
	});

	test('selects project locations and exposes the selected location derived store', () => {
		const locations = get(projectLocations);
		expect(locations.length).toBeGreaterThanOrEqual(4);

		selectLocation('weesp-castle');

		expect(get(selectedLocationId)).toBe('weesp-castle');
		expect(get(selectedLocation)?.name).toContain('Weesp');
	});

	test('toggles project layers into the raster layer store', () => {
		const weesp = get(projectLocations).find((location) => location.id === 'weesp-castle');
		const layer = weesp?.layers.find((item) => item.id === 'weesp-rgb');
		expect(layer).toBeDefined();

		toggleProjectLayer(layer!, true);

		expect(get(enabledProjectLayers).has('weesp-rgb')).toBe(true);
		expect(get(rasterLayers).get('project-weesp-rgb')).toMatchObject({
			id: 'project-weesp-rgb',
			name: 'High-resolution RGB',
			isVisible: true,
			opacity: 0.86
		});

		updateProjectLayerOpacity('weesp-rgb', 1.25);
		expect(get(rasterLayers).get('project-weesp-rgb')?.opacity).toBe(1);

		toggleProjectLayer(layer!, false);
		expect(get(enabledProjectLayers).has('weesp-rgb')).toBe(false);
		expect(get(rasterLayers).has('project-weesp-rgb')).toBe(false);
	});

	test('switching locations clears enabled project layers from raster store', () => {
		const weesp = get(projectLocations).find((location) => location.id === 'weesp-castle');
		const layer = weesp!.layers[0];

		toggleProjectLayer(layer, true);
		expect(get(rasterLayers).has(`project-${layer.id}`)).toBe(true);

		selectLocation('veldhoven');

		expect(get(enabledProjectLayers).size).toBe(0);
		expect(get(rasterLayers).has(`project-${layer.id}`)).toBe(false);
		expect(get(selectedLocationId)).toBe('veldhoven');
	});

	test('maps layer types to stable icon and badge tokens', () => {
		expect(getLayerTypeIcon('rgb')).toBe('camera');
		expect(getLayerTypeIcon('ml-prediction')).toBe('psychology');
		expect(getLayerTypeColor('infrared')).toBe('badge-error');
		expect(getLayerTypeColor('atmospheric')).toBe('badge-info');
	});
});
