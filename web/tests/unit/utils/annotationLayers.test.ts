import { describe, expect, test } from 'bun:test';
import {
	buildAnnotationCollection,
	ensureAnnotationLayers,
	syncAnnotationLayers,
	type AnnotationFeature
} from '$lib/components/Map/utils/annotationLayers';

function feature(id = 'stored'): AnnotationFeature {
	return {
		type: 'Feature',
		properties: { id },
		geometry: {
			type: 'LineString',
			coordinates: [
				[4.9, 52.3],
				[4.91, 52.31]
			]
		}
	};
}

function mapMock() {
	const sources = new Map<string, { setData: (data: unknown) => void; data: unknown }>();
	const layers = new Set<string>();
	const addedLayers: unknown[] = [];
	const movedLayers: string[] = [];

	return {
		getSource: (id: string) => sources.get(id),
		addSource: (id: string, source: { data: unknown }) => {
			sources.set(id, {
				data: source.data,
				setData(data: unknown) {
					this.data = data;
				}
			});
		},
		getLayer: (id: string) => (layers.has(id) ? { id } : undefined),
		addLayer: (layer: { id: string }) => {
			layers.add(layer.id);
			addedLayers.push(layer);
		},
		moveLayer: (id: string) => movedLayers.push(id),
		sources,
		addedLayers,
		movedLayers
	};
}

describe('annotationLayers', () => {
	test('builds a collection and includes active drawings with at least two coordinates', () => {
		const collection = buildAnnotationCollection(
			[feature()],
			[
				[4.92, 52.32],
				[4.93, 52.33]
			]
		);

		expect(collection.type).toBe('FeatureCollection');
		expect(collection.features).toHaveLength(2);
		expect(collection.features[1].properties).toEqual({ id: 'active', active: true });
	});

	test('does not include incomplete active drawings', () => {
		const collection = buildAnnotationCollection([feature()], [[4.92, 52.32]]);

		expect(collection.features).toHaveLength(1);
	});

	test('adds source and line layers when style is loaded', () => {
		const map = mapMock();

		ensureAnnotationLayers(map as any, true, [feature()], []);

		expect(map.sources.has('annotation-drawings')).toBe(true);
		expect(map.addedLayers).toHaveLength(2);
		expect(map.movedLayers).toEqual(['annotation-drawings-halo', 'annotation-drawings-line']);
	});

	test('syncs existing source data without duplicating layers', () => {
		const map = mapMock();
		ensureAnnotationLayers(map as any, true, [feature('initial')], []);

		syncAnnotationLayers(
			map as any,
			true,
			[feature('updated')],
			[
				[4.92, 52.32],
				[4.93, 52.33]
			]
		);

		expect(map.addedLayers).toHaveLength(2);
		expect(map.sources.get('annotation-drawings')?.data).toEqual(
			buildAnnotationCollection(
				[feature('updated')],
				[
					[4.92, 52.32],
					[4.93, 52.33]
				]
			)
		);
	});
});
