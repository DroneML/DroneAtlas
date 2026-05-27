import { describe, expect, test } from 'bun:test';
import { isClickOnVisibleRaster } from '$lib/components/Map/utils/rasterClickUtils';
import type { RasterLayer } from '$lib/types';

function layer(overrides: Partial<RasterLayer>): RasterLayer {
	return {
		id: 'layer-1',
		name: 'Layer 1',
		sourceUrl: 'https://example.test/layer.tif',
		isVisible: true,
		opacity: 0.8,
		isLoading: false,
		error: null,
		...overrides
	};
}

describe('rasterClickUtils', () => {
	test('detects clicks inside visible raster bounds for supported coordinate shapes', () => {
		const layers = new Map<string, RasterLayer>([
			['visible', layer({ bounds: [4, 50, 6, 52] })]
		]);

		expect(isClickOnVisibleRaster([5, 51], layers)).toBe(true);
		expect(isClickOnVisibleRaster({ lng: 5, lat: 51 }, layers)).toBe(true);
		expect(isClickOnVisibleRaster({ lon: 5, lat: 51 }, layers)).toBe(true);
	});

	test('ignores invisible and unbounded raster layers', () => {
		const layers = new Map<string, RasterLayer>([
			['hidden', layer({ bounds: [4, 50, 6, 52], isVisible: false })],
			['unbounded', layer({ id: 'layer-2', bounds: undefined })]
		]);

		expect(isClickOnVisibleRaster([5, 51], layers)).toBe(false);
	});

	test('returns false when click falls outside all visible bounds', () => {
		const layers = new Map<string, RasterLayer>([
			['visible', layer({ bounds: [4, 50, 6, 52] })]
		]);

		expect(isClickOnVisibleRaster([6.01, 51], layers)).toBe(false);
		expect(isClickOnVisibleRaster([5, 49.99], layers)).toBe(false);
	});
});
