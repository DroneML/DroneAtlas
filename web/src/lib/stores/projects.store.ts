import { writable, derived, get } from 'svelte/store';
import { base } from '$app/paths';
import type { ProjectLocation, ProjectLayerDef } from '$lib/types';
import { rasterLayers } from '$lib/stores/raster.store';
import type { RasterLayer } from '$lib/types';

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
    subtitle: 'Paper demo: in search of a castle',
    caseStudy: '4D Research Lab multi-sensor UAS case study',
    period: 'Field campaigns: February, June, and September 2022',
    description:
      'A medieval castle near Weesp, built after 1220 and destroyed in 1672, is no longer visible as a structure. The demo follows the paper workflow: combine drone sensor layers, train DroneML from expert labels, and inspect a probability map for likely wall, moat, and debris traces.',
    citation: weespSource,
    center: [5.0456, 52.3077],
    zoom: 16.9,
    bearing: -24,
    pitch: 58,
    facts: [
      { label: 'Site', value: 'medieval castle' },
      { label: 'Destroyed', value: '1672' },
      { label: 'LiDAR', value: '122M points' },
      { label: 'Anomalies', value: '55' }
    ],
    findings: [
      'probable castle wall traces',
      'moat and ditch edges',
      'possible wall debris',
      'post-depositional disturbance'
    ],
    workflow: [
      {
        title: '1. Acquire',
        description: 'Optical, thermal, multispectral, and LiDAR drone observations are collected across the site.'
      },
      {
        title: '2. Align',
        description: 'Sensor products become georeferenced layers that can be inspected together.'
      },
      {
        title: '3. Label',
        description: 'The archaeologist marks positive and negative examples of relevant anomalies.'
      },
      {
        title: '4. Learn',
        description: 'DroneML combines UNet-derived image features with a RandomForest classifier.'
      },
      {
        title: '5. Interpret',
        description: 'The probability map highlights where expert archaeological attention should focus.'
      }
    ],
    layers: [
      {
        id: 'weesp-optical',
        name: 'Optical cropmarks',
        type: 'rgb',
        sourceUrl: `${mockBase}/weesp/optical_cropmarks.tif`,
        colormap: 'terrain',
        opacity: 0.58,
        rescale: [0, 255],
        defaultEnabled: true,
        description: 'Visible-light crop and soil-mark contrast around the suspected castle footprint.',
        evidence: 'Subtle rectangular traces and texture shifts that are difficult to read in isolation.',
        layerMetadata: {
          indicator: 'Optical contrast',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'Visible cropmark and soil-mark proxy layer',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-thermal',
        name: 'Thermal infrared contrast',
        type: 'infrared',
        sourceUrl: `${mockBase}/weesp/thermal_contrast.tif`,
        colormap: 'inferno',
        opacity: 0.62,
        rescale: [12, 26],
        description: 'Thermal differences that can reveal buried material through heat-retention patterns.',
        evidence: 'Warmer linear signals around possible wall and debris zones.',
        layerMetadata: {
          indicator: 'Thermal contrast',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'Thermal infrared proxy layer',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-ndvi',
        name: 'Multispectral NDVI',
        type: 'multispectral',
        sourceUrl: `${mockBase}/weesp/ndvi.tif`,
        colormap: 'viridis',
        opacity: 0.58,
        rescale: [20, 90],
        description: 'Vegetation response layer for stress or growth changes above buried structures.',
        evidence: 'Lower vegetation response on wall traces and different response over possible moat fill.',
        layerMetadata: {
          indicator: 'NDVI proxy',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'Multispectral vegetation-index proxy layer',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-lidar',
        name: 'LiDAR DTM micro-relief',
        type: 'lidar',
        sourceUrl: `${mockBase}/weesp/lidar_dtm.tif`,
        colormap: 'terrain',
        opacity: 0.66,
        rescale: [0, 3],
        defaultEnabled: true,
        description: 'Fine-scale terrain variation representing residual relief and ditch morphology.',
        evidence: 'Low-relief rectangular and moat-like forms after the visible castle has disappeared.',
        layerMetadata: {
          indicator: 'Elevation proxy',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'LiDAR DTM micro-relief proxy layer',
          source: weespSource,
          hyperlink: 'https://doi.org/10.21942/uva.23375486.v3'
        }
      },
      {
        id: 'weesp-ml',
        name: 'DroneML probability',
        type: 'ml-prediction',
        sourceUrl: `${mockBase}/weesp/droneml_probability.tif`,
        colormap: 'plasma',
        opacity: 0.74,
        rescale: [0, 100],
        defaultEnabled: true,
        description: 'Per-pixel probability surface from the DroneML interpretation workflow.',
        evidence: 'Highlights likely castle walls, moat edges, and debris concentrations for expert review.',
        layerMetadata: {
          indicator: 'Detection probability',
          study: "'t Huijs ten Bosch, Weesp",
          definition: 'DroneML probability proxy layer',
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
		const rasterLayer: RasterLayer = {
			id: rasterStoreId,
			name: layerDef.name,
			sourceUrl: layerDef.sourceUrl,
			isVisible: true,
			opacity: layerDef.opacity ?? 0.8,
			isLoading: false,
			error: null,
			colormap: layerDef.colormap ?? 'viridis',
			rescale: layerDef.rescale,
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
