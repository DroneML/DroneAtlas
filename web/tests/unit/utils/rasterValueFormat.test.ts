import { describe, expect, test } from 'bun:test';
import {
	formatHoverRasterValue,
	isProbabilityLayerName
} from '$lib/components/Map/utils/rasterValueFormat';

describe('rasterValueFormat', () => {
	test('detects probability layer names case-insensitively', () => {
		expect(isProbabilityLayerName('Pathogen probability')).toBe(true);
		expect(isProbabilityLayerName('PROBABILITY surface')).toBe(true);
		expect(isProbabilityLayerName('Orthomosaic RGB')).toBe(false);
		expect(isProbabilityLayerName(null)).toBe(false);
	});

	test('formats probability values as rounded percentages', () => {
		expect(formatHoverRasterValue(42.49, 'Probability')).toBe('42%');
		expect(formatHoverRasterValue(42.5, 'Probability')).toBe('43%');
	});

	test('preserves non-probability values as numeric strings', () => {
		expect(formatHoverRasterValue(12.345, 'Elevation')).toBe('12.345');
		expect(formatHoverRasterValue(0, null)).toBe('0');
	});
});
