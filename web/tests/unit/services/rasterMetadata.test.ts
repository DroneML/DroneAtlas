import { describe, expect, test } from 'bun:test';
import { getRasterMetadata, getRasterMetadataByUrl } from '$lib/services/rasterMetadata';

describe('rasterMetadata service', () => {
	test('looks up pathogen metadata by exact raster file name', () => {
		const metadata = getRasterMetadata('SHIG_0011_Asym_Pr');

		expect(metadata).toBeDefined();
		expect(metadata?.type).toBe('Pathogen');
		expect(metadata?.variableName).toBe('SHIG');
		expect(metadata?.ageGroup).toBe('0-11 months');
		expect(metadata?.syndrome).toBe('Asymptomatic');
		expect(metadata?.indicator).toBe('Prevalence (%)');
	});

	test('extracts metadata from tif and tiff URLs', () => {
		expect(getRasterMetadataByUrl('https://example.test/cogs/SHIG_2459_Medi_SE.tif')?.indicator).toBe(
			'Standard error'
		);
		expect(getRasterMetadata('/local/data/Flr_Fin_Pr.tiff')?.variableName).toBe('Floor');
	});

	test('resolves layer-display names back to metadata', () => {
		const metadata = getRasterMetadata('SHIG 1223 Comm Pr');

		expect(metadata?.fileName).toBe('SHIG_1223_Comm_Pr');
		expect(metadata?.syndrome).toBe('Community detected diarrhea');
	});

	test('returns undefined for unknown raster identifiers', () => {
		expect(getRasterMetadata('UNKNOWN_LAYER')).toBeUndefined();
		expect(getRasterMetadataByUrl('https://example.test/no-match.tif')).toBeUndefined();
	});
});
