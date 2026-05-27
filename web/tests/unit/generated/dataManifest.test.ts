import { describe, expect, test } from 'bun:test';
import { latestDataDate, latestDataFile } from '$lib/generated/dataManifest';

describe('dataManifest', () => {
	test('exposes a valid ISO date and matching dashboard CSV filename', () => {
		expect(latestDataDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
		expect(Number.isNaN(Date.parse(`${latestDataDate}T00:00:00.000Z`))).toBe(false);
		expect(latestDataFile).toBe(`${latestDataDate}_Plan-EO_Dashboard_point_data.csv`);
	});
});
