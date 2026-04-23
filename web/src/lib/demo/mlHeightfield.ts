// Load the ML prediction GeoTIFF and downsample to a small values grid
// suitable for driving a 3D heightfield mesh. Returns normalised values
// in [0,1] (confidence) along with geographic bounds.

import { loadGeoTIFF, validateBounds } from '$lib/components/Map/utils/geoTiffProcessor';

export interface Heightfield {
	width: number;
	height: number;
	values: Float32Array; // row-major, [0,1]
	bounds: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
	minValue: number;
	maxValue: number;
}

export async function loadMlHeightfield(url: string, target = 128): Promise<Heightfield> {
	const { image, metadata } = await loadGeoTIFF(url);
	const rasters = await image.readRasters();
	const band: ArrayLike<number> = (rasters as unknown as ArrayLike<number>[])[0];
	const srcW = image.getWidth();
	const srcH = image.getHeight();

	// Find min/max in a single pass while skipping no-data sentinels.
	let minV = Infinity;
	let maxV = -Infinity;
	for (let i = 0; i < band.length; i++) {
		const v = band[i];
		if (!Number.isFinite(v)) continue;
		if (v < -1e10 || v > 1e10 || v === -9999 || v === -999) continue;
		if (v < minV) minV = v;
		if (v > maxV) maxV = v;
	}
	if (!Number.isFinite(minV)) {
		minV = 0;
		maxV = 1;
	}
	const range = Math.max(1e-6, maxV - minV);

	const tw = Math.min(target, srcW);
	const th = Math.min(target, srcH);
	const values = new Float32Array(tw * th);
	for (let ty = 0; ty < th; ty++) {
		const sy = Math.min(srcH - 1, Math.floor((ty + 0.5) * (srcH / th)));
		for (let tx = 0; tx < tw; tx++) {
			const sx = Math.min(srcW - 1, Math.floor((tx + 0.5) * (srcW / tw)));
			const v = band[sy * srcW + sx];
			let norm = 0;
			if (Number.isFinite(v) && v > -1e10 && v < 1e10 && v !== -9999 && v !== -999) {
				norm = Math.max(0, Math.min(1, (v - minV) / range));
			}
			values[ty * tw + tx] = norm;
		}
	}

	// Projection handling: geoTiffProcessor treats >180 magnitudes as
	// Web Mercator. validateBounds returns [west, south, east, north] in WGS84.
	const rawBounds = metadata.bounds ?? [];
	const projectionHint =
		Math.abs(rawBounds[0] ?? 0) > 180 || Math.abs(rawBounds[2] ?? 0) > 180
			? 'EPSG:3857'
			: 'EPSG:4326';
	const wgs = validateBounds(rawBounds, projectionHint) as [number, number, number, number];

	return {
		width: tw,
		height: th,
		values,
		bounds: wgs,
		minValue: minV,
		maxValue: maxV
	};
}

// Synthetic fallback if the tif cannot be loaded. Produces three gaussian
// "foundation" peaks over a small bounds box centred on Veldhoven.
export function syntheticHeightfield(
	center: [number, number],
	sizeDeg = 0.003,
	grid = 96
): Heightfield {
	const [clng, clat] = center;
	const bounds: [number, number, number, number] = [
		clng - sizeDeg,
		clat - sizeDeg,
		clng + sizeDeg,
		clat + sizeDeg
	];
	const peaks = [
		{ x: 0.35, y: 0.42, s: 0.08, a: 0.9 },
		{ x: 0.6, y: 0.55, s: 0.1, a: 0.75 },
		{ x: 0.48, y: 0.3, s: 0.06, a: 0.6 }
	];
	const values = new Float32Array(grid * grid);
	for (let y = 0; y < grid; y++) {
		for (let x = 0; x < grid; x++) {
			const u = x / (grid - 1);
			const v = y / (grid - 1);
			let sum = 0;
			for (const p of peaks) {
				const du = u - p.x;
				const dv = v - p.y;
				sum += p.a * Math.exp(-(du * du + dv * dv) / (2 * p.s * p.s));
			}
			values[y * grid + x] = Math.min(1, sum);
		}
	}
	return { width: grid, height: grid, values, bounds, minValue: 0, maxValue: 1 };
}

// Plasma-style colour ramp: dark purple → magenta → orange → yellow.
export function plasmaColor(t: number): [number, number, number] {
	const x = Math.max(0, Math.min(1, t));
	const stops: [number, [number, number, number]][] = [
		[0.0, [0.05, 0.03, 0.53]],
		[0.25, [0.42, 0.0, 0.66]],
		[0.5, [0.8, 0.27, 0.47]],
		[0.75, [0.98, 0.55, 0.25]],
		[1.0, [0.94, 0.98, 0.13]]
	];
	for (let i = 1; i < stops.length; i++) {
		const [tb, cb] = stops[i];
		if (x <= tb) {
			const [ta, ca] = stops[i - 1];
			const f = (x - ta) / (tb - ta);
			return [
				ca[0] + (cb[0] - ca[0]) * f,
				ca[1] + (cb[1] - ca[1]) * f,
				ca[2] + (cb[2] - ca[2]) * f
			];
		}
	}
	return stops[stops.length - 1][1];
}
