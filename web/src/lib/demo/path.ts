// Synthetic drone flight path over a region in the Netherlands.
// Generates a realistic lawn-mower survey pattern with gentle altitude variation.

export interface PathPoint {
	lng: number;
	lat: number;
	alt: number; // meters
}

export interface FlightPath {
	points: PathPoint[];
	bbox: [number, number, number, number]; // [minLng, minLat, maxLng, maxLat]
	center: [number, number];
	totalDistanceKm: number;
}

const CENTER: [number, number] = [4.9041, 52.3676]; // Amsterdam-ish

export function generateFlightPath(): FlightPath {
	const points: PathPoint[] = [];
	const passes = 8;
	const passLengthDeg = 0.012; // ~1.3 km
	const passSpacingDeg = 0.0015; // ~150 m
	const baseAlt = 80;
	const samplesPerPass = 60;

	const startLng = CENTER[0] - passLengthDeg / 2;
	const startLat = CENTER[1] - (passes * passSpacingDeg) / 2;

	for (let p = 0; p < passes; p++) {
		const lat = startLat + p * passSpacingDeg;
		const reverse = p % 2 === 1;
		for (let s = 0; s <= samplesPerPass; s++) {
			const f = s / samplesPerPass;
			const lng = startLng + (reverse ? 1 - f : f) * passLengthDeg;
			const alt = baseAlt + Math.sin((p + f) * Math.PI * 0.6) * 8;
			points.push({ lng, lat, alt });
		}
	}

	const lngs = points.map((p) => p.lng);
	const lats = points.map((p) => p.lat);
	const bbox: [number, number, number, number] = [
		Math.min(...lngs),
		Math.min(...lats),
		Math.max(...lngs),
		Math.max(...lats)
	];

	let totalDistanceKm = 0;
	for (let i = 1; i < points.length; i++) {
		totalDistanceKm += haversineKm(points[i - 1], points[i]);
	}

	return { points, bbox, center: CENTER, totalDistanceKm };
}

function haversineKm(a: PathPoint, b: PathPoint): number {
	const R = 6371;
	const dLat = ((b.lat - a.lat) * Math.PI) / 180;
	const dLng = ((b.lng - a.lng) * Math.PI) / 180;
	const lat1 = (a.lat * Math.PI) / 180;
	const lat2 = (b.lat * Math.PI) / 180;
	const h = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
	return 2 * R * Math.asin(Math.sqrt(h));
}

// Sample the path at progress t in [0, 1], returning interpolated lng/lat/alt + bearing.
export function samplePath(path: FlightPath, t: number): PathPoint & { bearing: number } {
	const clamped = Math.max(0, Math.min(1, t));
	const idxF = clamped * (path.points.length - 1);
	const i = Math.floor(idxF);
	const frac = idxF - i;
	const p0 = path.points[i];
	const p1 = path.points[Math.min(i + 1, path.points.length - 1)];
	const lng = p0.lng + (p1.lng - p0.lng) * frac;
	const lat = p0.lat + (p1.lat - p0.lat) * frac;
	const alt = p0.alt + (p1.alt - p0.alt) * frac;
	const bearing = (Math.atan2(p1.lng - p0.lng, p1.lat - p0.lat) * 180) / Math.PI;
	return { lng, lat, alt, bearing };
}
