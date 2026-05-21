import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { writeArrayBuffer } from 'geotiff';

const width = 256;
const height = 256;
// Approximate castle-field footprint near Gooilandseweg 7, Weesp.
// The rasters are synthetic, but their map placement should match the paper site.
const west = 5.07625;
const south = 52.29195;
const east = 5.07895;
const north = 52.2936;
const outputDir = join(process.cwd(), 'static', 'mock', 'weesp');

mkdirSync(outputDir, { recursive: true });

type LayerName = 'optical_cropmarks' | 'thermal_contrast' | 'ndvi' | 'lidar_dtm' | 'droneml_probability';

const layers: { name: LayerName; values: Uint8Array }[] = [
	{ name: 'optical_cropmarks', values: createLayer('optical_cropmarks') },
	{ name: 'thermal_contrast', values: createLayer('thermal_contrast') },
	{ name: 'ndvi', values: createLayer('ndvi') },
	{ name: 'lidar_dtm', values: createLayer('lidar_dtm') },
	{ name: 'droneml_probability', values: createLayer('droneml_probability') }
];

for (const layer of layers) {
	const metadata = {
		width,
		height,
		BitsPerSample: [8],
		SampleFormat: [1],
		SamplesPerPixel: [1],
		ModelPixelScale: [(east - west) / width, (north - south) / height, 0],
		ModelTiepoint: [0, 0, 0, west, north, 0],
		GeographicTypeGeoKey: 4326,
		GTModelTypeGeoKey: 2,
		GTRasterTypeGeoKey: 1,
		GeogCitationGeoKey: 'WGS 84'
	};
	const arrayBuffer = await writeArrayBuffer([...layer.values], metadata);
	writeFileSync(join(outputDir, `${layer.name}.tif`), Buffer.from(arrayBuffer));
}

function createLayer(layer: LayerName): Uint8Array {
	const values = new Uint8Array(width * height);
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const u = x / (width - 1);
			const v = y / (height - 1);
			const signal = castleSignal(u, v);
			const moat = rectTrace(u, v, 0.16, 0.16, 0.84, 0.82, 0.04);
			const wall = rectTrace(u, v, 0.24, 0.25, 0.76, 0.72, 0.018);
			const debris = gaussian(u, v, 0.39, 0.57, 0.075);
			const texture = noise(x, y) - 0.5;

			let value: number;
			switch (layer) {
				case 'optical_cropmarks':
					value = 126 + texture * 30 - wall * 38 + moat * 18 + debris * 22;
					break;
				case 'thermal_contrast':
					value = 17 + texture * 2.2 + wall * 5.5 + debris * 2.8 - moat * 1.2;
					break;
				case 'ndvi':
					value = 68 + texture * 8 - wall * 24 - debris * 12 + moat * 9;
					break;
				case 'lidar_dtm':
					value = 1.2 + texture * 0.18 + wall * 1.5 + debris * 0.7 - moat * 1.0;
					break;
				case 'droneml_probability':
					value = 6 + signal * 92 + texture * 5;
					break;
			}

			values[y * width + x] = clampByte(value);
		}
	}
	return values;
}

function castleSignal(u: number, v: number): number {
	const keep = Math.max(0, 1 - Math.hypot(u - 0.5, v - 0.5) / 0.72);
	const outerWall = rectTrace(u, v, 0.24, 0.25, 0.76, 0.72, 0.018) * 0.82;
	const tower = rectTrace(u, v, 0.24, 0.22, 0.43, 0.42, 0.018) * 0.95;
	const moat = rectTrace(u, v, 0.16, 0.16, 0.84, 0.82, 0.038) * 0.38;
	const ditch = lineTrace(u, v, 0.58, 0.24, 0.78, 0.7, 0.02) * 0.5;
	const debris = gaussian(u, v, 0.39, 0.57, 0.075) * 0.65;
	return Math.min(1, (outerWall + tower + moat + ditch + debris) * keep);
}

function gaussian(u: number, v: number, cx: number, cy: number, spread: number): number {
	const du = u - cx;
	const dv = v - cy;
	return Math.exp(-(du * du + dv * dv) / (2 * spread * spread));
}

function rectTrace(
	u: number,
	v: number,
	left: number,
	top: number,
	right: number,
	bottom: number,
	traceWidth: number
): number {
	const onVertical = v >= top && v <= bottom ? Math.min(Math.abs(u - left), Math.abs(u - right)) : 1;
	const onHorizontal = u >= left && u <= right ? Math.min(Math.abs(v - top), Math.abs(v - bottom)) : 1;
	const d = Math.min(onVertical, onHorizontal);
	return Math.exp(-(d * d) / (2 * traceWidth * traceWidth));
}

function lineTrace(
	u: number,
	v: number,
	ax: number,
	ay: number,
	bx: number,
	by: number,
	traceWidth: number
): number {
	const dx = bx - ax;
	const dy = by - ay;
	const len2 = dx * dx + dy * dy;
	const k = Math.max(0, Math.min(1, ((u - ax) * dx + (v - ay) * dy) / len2));
	const px = ax + k * dx;
	const py = ay + k * dy;
	const d = Math.hypot(u - px, v - py);
	return Math.exp(-(d * d) / (2 * traceWidth * traceWidth));
}

function noise(x: number, y: number): number {
	const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
	return n - Math.floor(n);
}

function clampByte(value: number): number {
	return Math.max(0, Math.min(255, Math.round(value)));
}
