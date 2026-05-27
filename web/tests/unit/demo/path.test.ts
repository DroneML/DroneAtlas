import { describe, expect, test } from 'bun:test';
import { generateFlightPath, samplePath } from '$lib/demo/path';

describe('demo flight path', () => {
	test('generates a bounded lawn-mower path with expected sample count', () => {
		const path = generateFlightPath({ center: [5, 52], passes: 3, passLengthKm: 0.6, passSpacingM: 30, baseAlt: 100 });

		expect(path.points).toHaveLength(183);
		expect(path.center).toEqual([5, 52]);
		expect(path.totalDistanceKm).toBeGreaterThan(1.7);
		expect(path.bbox[0]).toBeLessThan(path.center[0]);
		expect(path.bbox[2]).toBeGreaterThan(path.center[0]);
		expect(path.bbox[1]).toBeLessThan(path.bbox[3]);
	});

	test('samples clamp progress and interpolate along the path', () => {
		const path = generateFlightPath({ passes: 2, passLengthKm: 0.2 });
		const first = samplePath(path, -1);
		const middle = samplePath(path, 0.5);
		const last = samplePath(path, 2);

		expect(first.lng).toBe(path.points[0].lng);
		expect(first.lat).toBe(path.points[0].lat);
		expect(last.lng).toBe(path.points[path.points.length - 1].lng);
		expect(last.lat).toBe(path.points[path.points.length - 1].lat);
		expect(middle.alt).toBeGreaterThan(60);
		expect(Number.isFinite(middle.bearing)).toBe(true);
	});
});
