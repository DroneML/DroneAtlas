import { describe, expect, test } from 'bun:test';
import {
	findVisibleRasterLayerAtCoordinate,
	getRasterValueAtCoordinate,
	getRasterValueAtCoordinateFast,
	isLatitudeInWebMercatorRange
} from '$lib/components/Map/utils/rasterPixelQuery';
import type { RasterLayer } from '$lib/types';

function layer(overrides: Partial<RasterLayer> = {}): RasterLayer {
	return {
		id: 'layer-1',
		name: 'Layer 1',
		sourceUrl: 'https://example.test/layer.tif',
		bounds: [0, 0, 2, 2],
		width: 2,
		height: 2,
		rasterData: new Float32Array([1.111, 2.222, 3.333, 4.444]),
		isVisible: true,
		opacity: 1,
		isLoading: false,
		error: null,
		...overrides
	};
}

describe('rasterPixelQuery', () => {
	test('validates Web Mercator latitude range', () => {
		expect(isLatitudeInWebMercatorRange(85)).toBe(true);
		expect(isLatitudeInWebMercatorRange(86)).toBe(false);
		expect(isLatitudeInWebMercatorRange(-86)).toBe(false);
	});

	test('reads and rounds raster values at geographic coordinates', () => {
		const raster = layer();

		expect(getRasterValueAtCoordinate(raster, 0.5, 1.5)).toBe(1.11);
		expect(getRasterValueAtCoordinateFast(raster, 1.5, 0.5)).toBe(4.44);
	});

	test('normalizes wrapped longitudes from world copies', () => {
		const raster = layer({ bounds: [-180, 0, -178, 2] });

		expect(getRasterValueAtCoordinateFast(raster, 181, 1.5)).toBe(2.22);
	});

	test('returns null outside bounds or for no-data values', () => {
		expect(getRasterValueAtCoordinateFast(layer(), 5, 1)).toBeNull();
		expect(
			getRasterValueAtCoordinateFast(
				layer({ rasterData: new Float32Array([NaN, 2, 3, 4]) }),
				0.5,
				1.5
			)
		).toBeNull();
		expect(getRasterValueAtCoordinateFast(layer({ rasterData: undefined }), 0.5, 1.5)).toBeNull();
	});

	test('finds the top-most visible raster with numeric data', () => {
		const bottom = layer({ id: 'bottom', rasterData: new Float32Array([1, 1, 1, 1]) });
		const overlay = layer({ id: 'overlay', rasterData: undefined });
		const top = layer({ id: 'top', rasterData: new Float32Array([9, 9, 9, 9]) });
		const layers = new Map<string, RasterLayer>([
			['bottom', bottom],
			['overlay', overlay],
			['top', top]
		]);

		expect(findVisibleRasterLayerAtCoordinate(layers, 0.5, 1.5)?.id).toBe('top');
	});
});
