/**
 * Unit tests for heatmap utilities
 */

import { describe, test, expect } from 'bun:test';
import type { PointFeatureCollection } from '$lib/types';
import { createPointFeature } from '../../helpers/factories/point-data';
import {
	getHeatmapPaintProperties,
	isDataSuitableForHeatmap
} from '$lib/components/Map/utils/heatmapUtils';

describe('heatmapUtils', () => {
	function collection(features: ReturnType<typeof createPointFeature>[]): PointFeatureCollection {
		return { type: 'FeatureCollection', features };
	}

	function point(id: string, coordinates: [number, number], overrides = {}) {
		return createPointFeature({
			id,
			geometry: { type: 'Point', coordinates },
			properties: {
				...createPointFeature().properties,
				id,
				...overrides
			}
		});
	}

	describe('getHeatmapPaintProperties', () => {
		test('returns valid heatmap paint properties object', () => {
			const properties = getHeatmapPaintProperties();

			expect(properties).toBeDefined();
			expect(properties['heatmap-weight']).toBeDefined();
			expect(properties['heatmap-intensity']).toBeDefined();
			expect(properties['heatmap-color']).toBeDefined();
			expect(properties['heatmap-radius']).toBeDefined();
			expect(properties['heatmap-opacity']).toBeDefined();
		});

		test('heatmap-weight is an interpolation expression', () => {
			const properties = getHeatmapPaintProperties();
			const weight = properties['heatmap-weight'];

			expect(Array.isArray(weight)).toBe(true);
			expect(weight[0]).toBe('interpolate');
		});

		test('heatmap-intensity varies with zoom level', () => {
			const properties = getHeatmapPaintProperties();
			const intensity = properties['heatmap-intensity'];

			expect(Array.isArray(intensity)).toBe(true);
			expect(intensity[0]).toBe('interpolate');
			expect(intensity[2]).toEqual(['zoom']);
		});

		test('heatmap-color has proper color gradient', () => {
			const properties = getHeatmapPaintProperties();
			const color = properties['heatmap-color'];

			expect(Array.isArray(color)).toBe(true);
			expect(color[0]).toBe('interpolate');

			// Should contain color definitions
			const colorString = JSON.stringify(color);
			expect(colorString).toContain('rgb');
		});

		test('heatmap-radius increases with zoom', () => {
			const properties = getHeatmapPaintProperties();
			const radius = properties['heatmap-radius'];

			expect(Array.isArray(radius)).toBe(true);
			expect(radius[0]).toBe('interpolate');
			expect(radius[2]).toEqual(['zoom']);

			// Check that radius values increase with zoom
			// Format: ['interpolate', ['linear'], ['zoom'], zoom1, radius1, zoom2, radius2, ...]
			const zoom0Radius = radius[4]; // radius at zoom 0
			const zoom15Radius = radius[12]; // radius at zoom 15

			expect(zoom15Radius).toBeGreaterThan(zoom0Radius);
		});

		test('heatmap-opacity varies with zoom', () => {
			const properties = getHeatmapPaintProperties();
			const opacity = properties['heatmap-opacity'];

			expect(Array.isArray(opacity)).toBe(true);
			expect(opacity[0]).toBe('interpolate');
			expect(opacity[2]).toEqual(['zoom']);
		});

		test('returns consistent properties on multiple calls', () => {
			const properties1 = getHeatmapPaintProperties();
			const properties2 = getHeatmapPaintProperties();

			expect(JSON.stringify(properties1)).toBe(JSON.stringify(properties2));
		});
	});

	describe('isDataSuitableForHeatmap', () => {
		test('returns true for data with sufficient points', () => {
			const data = collection([
				point('1', [5.0, 52.0], { prevalenceValue: 0.5, samples: 100, design: 'Surveillance' }),
				point('2', [6.0, 53.0], { prevalenceValue: 0.3, samples: 50, design: 'Cohort' }),
				point('3', [7.0, 54.0], { prevalenceValue: 0.7, samples: 150, design: 'Case-Control' })
			]);

			expect(isDataSuitableForHeatmap(data)).toBe(true);
		});

		test('returns false for data with too few points', () => {
			const data = collection([
				point('1', [5.0, 52.0], { prevalenceValue: 0.5, samples: 100, design: 'Surveillance' })
			]);

			expect(isDataSuitableForHeatmap(data)).toBe(false);
		});

		test('returns false for empty dataset', () => {
			const data: PointFeatureCollection = {
				type: 'FeatureCollection',
				features: []
			};

			expect(isDataSuitableForHeatmap(data)).toBe(false);
		});

		test('returns true even without prevalence values (uses uniform weights)', () => {
			const data = collection([
				point('1', [5.0, 52.0], { samples: 100, design: 'Surveillance', prevalenceValue: undefined as any }),
				point('2', [6.0, 53.0], { samples: 50, design: 'Cohort', prevalenceValue: undefined as any }),
				point('3', [7.0, 54.0], { samples: 150, design: 'Case-Control', prevalenceValue: undefined as any })
			]);

			expect(isDataSuitableForHeatmap(data)).toBe(true);
		});

		test('returns true when at least one point has prevalence value', () => {
			const data = collection([
				point('1', [5.0, 52.0], { samples: 100, design: 'Surveillance', prevalenceValue: undefined as any }),
				point('2', [6.0, 53.0], { prevalenceValue: 0.3, samples: 50, design: 'Cohort' }),
				point('3', [7.0, 54.0], { samples: 150, design: 'Case-Control', prevalenceValue: undefined as any })
			]);

			expect(isDataSuitableForHeatmap(data)).toBe(true);
		});

		test('handles null prevalence values correctly', () => {
			const data = collection([
				point('1', [5.0, 52.0], { prevalenceValue: null as any, samples: 100, design: 'Surveillance' }),
				point('2', [6.0, 53.0], { prevalenceValue: null as any, samples: 50, design: 'Cohort' }),
				point('3', [7.0, 54.0], { prevalenceValue: null as any, samples: 150, design: 'Case-Control' })
			]);

			// Should still be suitable (will use uniform weights)
			expect(isDataSuitableForHeatmap(data)).toBe(true);
		});

		test('returns true for exactly 3 points', () => {
			const data = collection([
				point('1', [5.0, 52.0], { prevalenceValue: 0.5, samples: 100, design: 'Surveillance' }),
				point('2', [6.0, 53.0], { prevalenceValue: 0.3, samples: 50, design: 'Cohort' }),
				point('3', [7.0, 54.0], { prevalenceValue: 0.7, samples: 150, design: 'Case-Control' })
			]);

			expect(isDataSuitableForHeatmap(data)).toBe(true);
		});

		test('returns false for 2 points', () => {
			const data = collection([
				point('1', [5.0, 52.0], { prevalenceValue: 0.5, samples: 100, design: 'Surveillance' }),
				point('2', [6.0, 53.0], { prevalenceValue: 0.3, samples: 50, design: 'Cohort' })
			]);

			expect(isDataSuitableForHeatmap(data)).toBe(false);
		});
	});
});
