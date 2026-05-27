import { writable, derived, get } from 'svelte/store';
import { base } from '$app/paths';
import type { ProjectLocation, ProjectLayerDef } from '$lib/types';
import { rasterLayers } from '$lib/stores/raster.store';
import type { RasterLayer } from '$lib/types';
import { WEESP_DEMO_CENTER, WEESP_IMAGE_BOUNDS, WEESP_IMAGE_URLS } from '$lib/demo/weesp';

// Mock data served from static/mock/ during development.
// Replace with R2 URLs (e.g. https://pub-xxx.r2.dev/cogs/projects/...) for production.
const mockBase = `${base}/mock`;

const weespSource =
  'Waagen, J. (2023). 4DRL Report Series 4 - In search of a castle. DOI: 10.21942/uva.23375486.v3.';

// Project locations for the main demo. The Weesp entry is the paper-backed case;
// the other entries remain available as secondary examples.
const sampleLocations: ProjectLocation[] = [
  {
    id: 'weesp-castle',
    name: "'t Huijs ten Bosch, Weesp",
    subtitle: 'Image-layer demo: in search of a castle',
    caseStudy: '4D Research Lab multi-sensor visual case study',
    period: 'Field campaigns: February, June, and September 2022',
    description:
      'A medieval castle near Weesp, built after 1220 and destroyed in 1672, is no longer visible as a structure. The demo uses four lightweight visual image layers plus a numeric anomaly-probability raster for hover inspection.',
    citation: weespSource,
    center: WEESP_DEMO_CENTER,
    zoom: 18.45,
    bearing: -24,
    pitch: 58,
    facts: [
      { label: 'Site', value: 'medieval castle' },
      { label: 'Destroyed', value: '1672' },
      { label: 'Layers', value: '4 visual + probability' },
      { label: 'Format', value: '1:1 PNG' }
    ],
    findings: [
      'probable castle wall traces',
      'moat and ditch edges',
      'possible wall debris',
      'post-depositional disturbance'
    ],
    workflow: [
      {
        title: '1. Fly',
        description: 'The drone camera targets the Weesp reference coordinate and survey footprint.'
      },
      {
        title: '2. Stack',
        description: 'RGB, LiDAR, multispectral, thermal, and probability rasters are placed as map layers.'
      },
      {
        title: '3. Toggle',
        description: 'Layer opacity and visibility reveal different physical signals.'
      },
      {
        title: '4. Interpret',
        description: 'The probability raster gives numeric predictions over likely anomaly traces.'
      }
    ],
    layers: [
      {
        id: 'weesp-rgb',
        name: 'High-resolution RGB',
        type: 'rgb',
        sourceUrl: WEESP_IMAGE_URLS.rgb,
        imageUrl: WEESP_IMAGE_URLS.rgb,
        bounds: WEESP_IMAGE_BOUNDS,
        opacity: 0.86,
        defaultEnabled: true,
        description: 'The surface base layer for field context, visible cropmarks, and present-day texture.',
        evidence: 'Shows the ground surface, surrounding water/road context, and subtle visible texture changes.',
        layerMetadata: {
          indicator: 'RGB visual context',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'High-resolution RGB image overlay',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-lidar',
        name: 'LiDAR micro-topography',
        type: 'lidar',
        sourceUrl: WEESP_IMAGE_URLS.lidar,
        imageUrl: WEESP_IMAGE_URLS.lidar,
        bounds: WEESP_IMAGE_BOUNDS,
        opacity: 0.56,
        defaultEnabled: true,
        description: 'Micro-topographic layer for residual relief, buried wall lines, and moat morphology.',
        evidence: 'Reveals low-relief rectangular and moat-like forms after the visible castle has disappeared.',
        layerMetadata: {
          indicator: 'LiDAR relief',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'LiDAR micro-topography image overlay',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-multispectral',
        name: 'Multispectral NDVI',
        type: 'multispectral',
        sourceUrl: WEESP_IMAGE_URLS.multispectral,
        imageUrl: WEESP_IMAGE_URLS.multispectral,
        bounds: WEESP_IMAGE_BOUNDS,
        opacity: 0.38,
        defaultEnabled: true,
        description: 'Vegetation response layer for stress or growth changes above buried structures.',
        evidence: 'Highlights vegetation stress contrasts around possible walls and moat fills.',
        layerMetadata: {
          indicator: 'NDVI visual proxy',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'Multispectral vegetation-stress image overlay',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-thermal',
        name: 'Thermal infrared contrast',
        type: 'infrared',
        sourceUrl: WEESP_IMAGE_URLS.thermal,
        imageUrl: WEESP_IMAGE_URLS.thermal,
        bounds: WEESP_IMAGE_BOUNDS,
        opacity: 0.42,
        defaultEnabled: true,
        description: 'Thermal differences that can reveal buried material through heat-retention patterns.',
        evidence: 'Highlights heat-capacity signatures along possible wall, moat, and debris zones.',
        layerMetadata: {
          indicator: 'Thermal visual contrast',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'Thermal infrared image overlay',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-probability',
        name: 'Anomaly probability',
        type: 'ml-prediction',
        sourceUrl: `${mockBase}/weesp/anomaly_probability.png`,
        bounds: WEESP_IMAGE_BOUNDS,
        opacity: 0.62,
        defaultEnabled: true,
        description: 'Numeric prediction raster over the visible anomaly traces for hover inspection.',
        evidence: 'Provides per-pixel probability values on walls, moat edges, and debris-like signals.',
        layerMetadata: {
          indicator: 'Probability prediction',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'Anomaly probability raster overlay',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      }
    ]
  },
	{
		id: 'veldhoven',
		name: 'Veldhoven',
		description: 'Archaeological survey site in Veldhoven, Netherlands. Multi-sensor drone acquisition for subsurface anomaly detection.',
		center: [5.4053, 51.4203],
		zoom: 17,
		pitch: 45,
		layers: [
			{
				id: 'veldhoven-rgb',
				name: 'RGB Orthomosaic',
				type: 'rgb',
				sourceUrl: `${mockBase}/veldhoven/rgb_ortho.tif`,
				opacity: 0.9
			},
			{
				id: 'veldhoven-infrared',
				name: 'Infrared',
				type: 'infrared',
				sourceUrl: `${mockBase}/veldhoven/infrared.tif`,
				colormap: 'inferno',
				opacity: 0.8
			},
			{
				id: 'veldhoven-lidar',
				name: 'LiDAR DSM',
				type: 'lidar',
				sourceUrl: `${mockBase}/veldhoven/lidar_dsm.tif`,
				colormap: 'terrain',
				opacity: 0.8
			},
			{
				id: 'veldhoven-ml',
				name: 'ML Prediction',
				type: 'ml-prediction',
				sourceUrl: `${mockBase}/veldhoven/ml_prediction.tif`,
				colormap: 'plasma',
				opacity: 0.7
			}
		]
	},
	{
		id: 'ostia-antica',
		name: 'Ostia Antica',
		description: 'Roman archaeological site near Rome. Drone-based thermal and multispectral survey of buried structures.',
		center: [12.2916, 41.7558],
		zoom: 17,
		pitch: 45,
		layers: [
			{
				id: 'ostia-rgb',
				name: 'RGB Orthomosaic',
				type: 'rgb',
				sourceUrl: `${mockBase}/ostia-antica/rgb_ortho.tif`,
				opacity: 0.9
			},
			{
				id: 'ostia-infrared',
				name: 'Thermal',
				type: 'infrared',
				sourceUrl: `${mockBase}/ostia-antica/thermal.tif`,
				colormap: 'inferno',
				opacity: 0.8
			},
			{
				id: 'ostia-ndvi',
				name: 'NDVI',
				type: 'multispectral',
				sourceUrl: `${mockBase}/ostia-antica/ndvi.tif`,
				colormap: 'viridis',
				opacity: 0.8
			},
			{
				id: 'ostia-atmospheric',
				name: 'Atmospheric',
				type: 'atmospheric',
				sourceUrl: `${mockBase}/ostia-antica/atmospheric.tif`,
				colormap: 'magma',
				opacity: 0.7
			},
			{
				id: 'ostia-ml',
				name: 'ML Prediction',
				type: 'ml-prediction',
				sourceUrl: `${mockBase}/ostia-antica/ml_prediction.tif`,
				colormap: 'plasma',
				opacity: 0.7
			}
		]
	},
	{
		id: 'veluwe',
		name: 'Veluwe Heathland',
		description: 'Ecological monitoring of heathland vegetation on the Veluwe, Netherlands. Multispectral analysis of vegetation health.',
		center: [5.8372, 52.0833],
		zoom: 16,
		pitch: 30,
		layers: [
			{
				id: 'veluwe-rgb',
				name: 'RGB Orthomosaic',
				type: 'rgb',
				sourceUrl: `${mockBase}/veluwe/rgb_ortho.tif`,
				opacity: 0.9
			},
			{
				id: 'veluwe-ndvi',
				name: 'NDVI',
				type: 'multispectral',
				sourceUrl: `${mockBase}/veluwe/ndvi.tif`,
				colormap: 'viridis',
				opacity: 0.8
			},
			{
				id: 'veluwe-lidar',
				name: 'Canopy Height Model',
				type: 'lidar',
				sourceUrl: `${mockBase}/veluwe/chm.tif`,
				colormap: 'terrain',
				opacity: 0.8
			}
		]
	}
];

// Stores
export const projectLocations = writable<ProjectLocation[]>(sampleLocations);
export const selectedLocationId = writable<string | null>(null);

// Track which project layers are currently enabled (by layer ID)
export const enabledProjectLayers = writable<Set<string>>(new Set());

// Derived: currently selected location
export const selectedLocation = derived(
	[projectLocations, selectedLocationId],
	([$locations, $id]) => {
		if (!$id) return null;
		return $locations.find((l) => l.id === $id) ?? null;
	}
);

// Select a location (does not fly to it - that's handled by the component)
export function selectLocation(id: string | null): void {
	const currentId = get(selectedLocationId);
	if (currentId === id) return;

	// When switching locations, remove all project layers from the raster store
	const enabled = get(enabledProjectLayers);
	if (enabled.size > 0) {
		rasterLayers.update((layers) => {
			for (const layerId of enabled) {
				layers.delete(`project-${layerId}`);
			}
			return new Map(layers);
		});
		enabledProjectLayers.set(new Set());
	}

	selectedLocationId.set(id);
}

// Toggle a project layer on/off
export function toggleProjectLayer(layerDef: ProjectLayerDef, enable: boolean): void {
	const rasterStoreId = `project-${layerDef.id}`;

	enabledProjectLayers.update((set) => {
		const next = new Set(set);
		if (enable) {
			next.add(layerDef.id);
		} else {
			next.delete(layerDef.id);
		}
		return next;
	});

	if (enable) {
		// Add to raster layers store so existing RasterLayerManager renders it
		const generatedRaster = createGeneratedProjectRaster(layerDef);
		const rasterLayer: RasterLayer = {
			id: rasterStoreId,
			name: layerDef.name,
			sourceUrl: layerDef.sourceUrl,
			dataUrl: generatedRaster?.dataUrl ?? layerDef.imageUrl,
			bounds: generatedRaster?.bounds ?? layerDef.bounds,
			isVisible: true,
			opacity: layerDef.opacity ?? 0.8,
			isLoading: false,
			error: null,
			colormap: layerDef.colormap ?? 'viridis',
			rescale: layerDef.rescale,
			rasterData: generatedRaster?.rasterData,
			width: generatedRaster?.width,
			height: generatedRaster?.height,
			layerMetadata: layerDef.layerMetadata
		};
		rasterLayers.update((layers) => {
			layers.set(rasterStoreId, rasterLayer);
			return new Map(layers);
		});
	} else {
		// Remove from raster layers store
		rasterLayers.update((layers) => {
			layers.delete(rasterStoreId);
			return new Map(layers);
		});
	}
}

function createGeneratedProjectRaster(layerDef: ProjectLayerDef):
	| {
			dataUrl: string;
			bounds: [number, number, number, number];
			rasterData: Float32Array;
			width: number;
			height: number;
	  }
	| null {
	if (layerDef.id !== 'weesp-probability' || typeof document === 'undefined') return null;

	const width = 256;
	const height = 256;
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	if (!context) return null;

	const image = context.createImageData(width, height);
	const rasterData = new Float32Array(width * height);

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const u = x / (width - 1);
			const v = y / (height - 1);
			const value = anomalyProbability(u, v, x, y);
			const index = y * width + x;
			const pixel = index * 4;

			if (value < 18) {
				rasterData[index] = Number.NaN;
				image.data[pixel + 3] = 0;
				continue;
			}

			rasterData[index] = Math.round(value);
			const color = probabilityColor(value);
			image.data[pixel] = color[0];
			image.data[pixel + 1] = color[1];
			image.data[pixel + 2] = color[2];
			image.data[pixel + 3] = Math.round(48 + (value / 100) * 150);
		}
	}

	context.putImageData(image, 0, 0);
	return {
		dataUrl: canvas.toDataURL('image/png'),
		bounds: WEESP_IMAGE_BOUNDS,
		rasterData,
		width,
		height
	};
}

function anomalyProbability(u: number, v: number, x: number, y: number): number {
	const outerWall = rectTrace(u, v, 0.27, 0.22, 0.84, 0.82, 0.012) * 82;
	const innerWall = rectTrace(u, v, 0.4, 0.35, 0.76, 0.68, 0.014) * 94;
	const keep = rectTrace(u, v, 0.53, 0.39, 0.64, 0.5, 0.013) * 88;
	const tower = rectTrace(u, v, 0.39, 0.44, 0.49, 0.55, 0.014) * 78;
	const debris = gaussian(u, v, 0.5, 0.62, 0.045) * 84;
	const gate = gaussian(u, v, 0.44, 0.7, 0.038) * 76;
	const texture = (noise(x, y) - 0.5) * 6;
	return Math.max(0, Math.min(99, Math.max(outerWall, innerWall, keep, tower, debris, gate) + texture));
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

function gaussian(u: number, v: number, cx: number, cy: number, spread: number): number {
	const du = u - cx;
	const dv = v - cy;
	return Math.exp(-(du * du + dv * dv) / (2 * spread * spread));
}

function noise(x: number, y: number): number {
	const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
	return n - Math.floor(n);
}

function probabilityColor(value: number): [number, number, number] {
	if (value >= 78) return [255, 232, 75];
	if (value >= 56) return [255, 142, 58];
	if (value >= 36) return [230, 69, 150];
	return [105, 207, 255];
}

// Update opacity of an enabled project layer
export function updateProjectLayerOpacity(layerDefId: string, opacity: number): void {
	const rasterStoreId = `project-${layerDefId}`;
	rasterLayers.update((layers) => {
		const layer = layers.get(rasterStoreId);
		if (layer) {
			layer.opacity = Math.max(0, Math.min(1, opacity));
		}
		return new Map(layers);
	});
}

// Get the icon name for a layer type
export function getLayerTypeIcon(type: ProjectLayerDef['type']): string {
	switch (type) {
		case 'rgb': return 'camera';
		case 'infrared': return 'thermostat';
		case 'multispectral': return 'layers';
		case 'lidar': return 'terrain';
		case 'atmospheric': return 'cloud';
		case 'ml-prediction': return 'psychology';
		default: return 'layers';
	}
}

// Get a display color for a layer type (for the badge)
export function getLayerTypeColor(type: ProjectLayerDef['type']): string {
	switch (type) {
		case 'rgb': return 'badge-primary';
		case 'infrared': return 'badge-error';
		case 'multispectral': return 'badge-success';
		case 'lidar': return 'badge-warning';
		case 'atmospheric': return 'badge-info';
		case 'ml-prediction': return 'badge-secondary';
		default: return 'badge-ghost';
	}
}
