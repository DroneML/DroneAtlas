import type { Beat } from './timeline';
import { easing } from './timeline';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { DroneLayer } from './DroneLayer';
import type { FlightPath } from './path';
import { samplePath } from './path';
import { WEESP_DEMO_CENTER } from './weesp';

export interface SceneRefs {
	map: MaplibreMap;
	droneLayer: DroneLayer;
	path: FlightPath;
	setSensorActive: (id: string, active: boolean) => void;
	setDetectionVisible: (id: string, visible: boolean) => void;
	setTelemetry: (t: {
		altitude?: number;
		speed?: number;
		coverageKm2?: number;
		detections?: number;
	}) => void;
	setSensorStackProgress: (p: number) => void;
	setSplitReveal: (p: number) => void;
	setSurveyBox: (visible: boolean) => void;
	setAnalysisPopup: (visible: boolean) => void;
}

const WEESP: [number, number] = WEESP_DEMO_CENTER;
const AMSTERDAM: [number, number] = [4.9041, 52.3676];

export function buildBeats(refs: SceneRefs): Beat[] {
	const { map, droneLayer, path } = refs;

	const resetSensors = () => {
		for (const id of ['rgb', 'lidar', 'multispectral', 'thermal']) refs.setSensorActive(id, false);
	};
	const resetDetections = () => {
		for (const id of ['foundation', 'wall', 'pit']) refs.setDetectionVisible(id, false);
	};
	const resetVisuals = () => {
		resetSensors();
		resetDetections();
		refs.setSurveyBox(false);
		refs.setSensorStackProgress(0);
		refs.setSplitReveal(0);
		refs.setAnalysisPopup(false);
		droneLayer.setParticleIntensity(0);
		droneLayer.setSiteModelVisible(false);
	};

	let offset = 0;
	const at = (duration: number) => {
		const start = offset;
		offset += duration;
		return { start, duration };
	};

	return [
		{
			id: 'search',
			title: 'In Search Of A Castle',
			subtitle: "A real case: 't Huijs ten Bosch, Weesp",
			caption: '',
			presenterNote:
				'A medieval castle disappeared from the landscape. The traces are still there, but only as faint signals across drone sensor layers. Layer comparison helps archaeologists find those signals. DroneATLAS makes that workflow accessible as a research platform.',
			showTelemetry: false,
			...at(8),
			enter: () => {
				resetVisuals();
				refs.setSurveyBox(true);
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: AMSTERDAM, zoom: 8.2, pitch: 0, bearing: 0 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				const processing = Math.max(0, Math.min(1, (t - 0.34) / 0.56));
				refs.setSensorStackProgress(processing);
				if (t > 0.4) refs.setSensorActive('rgb', true);
				if (t > 0.54) refs.setSensorActive('lidar', true);
				if (t > 0.68) refs.setSensorActive('multispectral', true);
				if (t > 0.82) refs.setSensorActive('thermal', true);
				map.jumpTo({
					center: lerpLngLat(AMSTERDAM, WEESP, eased),
					zoom: 8.2 + eased * 5.2,
					pitch: eased * 28,
					bearing: -eased * 12
				});
			}
		},

		{
			id: 'collaboration',
			title: 'The Collaboration',
			subtitle: 'Archaeology, research software engineering, and community validation',
			caption: 'Domain expertise + RSE + community testing.',
			presenterNote:
				'This work is a collaboration. 4D Research Lab brings the archaeological fieldwork and drone-sensing expertise. The Netherlands eScience Center brings research software engineering and machine learning. Partners and workshop communities help test whether the result is actually useful.',
			showTelemetry: false,
			...at(7),
			enter: () => {
				resetVisuals();
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: WEESP, zoom: 10.8, pitch: 12, bearing: -8 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				map.jumpTo({
					center: WEESP,
					zoom: 10.8 + eased * 0.7,
					pitch: 12,
					bearing: -8 + eased * 10
				});
			}
		},

		{
			id: 'use-case',
			title: 'The Weesp Use Case',
			subtitle: 'A medieval site studied through repeated drone surveys',
			caption: 'February, June, and September 2022 field campaigns.',
			presenterNote:
				"At Weesp, 4D Research Lab investigated the medieval castle site of 't Huijs ten Bosch. The campaign used optical, thermal infrared, multispectral, and LiDAR sensors across several moments in the year to understand the extent and preservation of buried remains.",
			showTelemetry: false,
			...at(8),
			enter: () => {
				resetVisuals();
				droneLayer.setVisibility({ drone: false, path: true, particles: false, finding: false });
				droneLayer.setProgress(1);
				map.jumpTo({ center: path.center, zoom: 14.6, pitch: 32, bearing: -18 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				map.jumpTo({
					center: path.center,
					zoom: 14.6 + eased * 0.8,
					pitch: 32 + eased * 12,
					bearing: -18 + eased * 18
				});
			}
		},

		{
			id: 'sensors',
			title: 'Many Sensors, One Hidden Site',
			subtitle: 'LiDAR · multispectral · thermal · probability',
			caption: 'Each sensor sees a different physical signal.',
			presenterNote:
				'No single layer tells the full story. Thermal data shows heat-retention differences. Multispectral indices show vegetation stress. LiDAR and elevation models show micromorphology. The probability raster keeps the inspection numeric.',
			showTelemetry: false,
			...at(9),
			enter: () => {
				resetVisuals();
				refs.setSurveyBox(true);
				droneLayer.setVisibility({ drone: false, path: true, particles: false, finding: false });
				droneLayer.setProgress(1);
				map.jumpTo({ center: path.center, zoom: 15.2, pitch: 50, bearing: -24 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				refs.setSensorStackProgress(Math.max(0, (t - 0.1) / 0.82));
				if (t > 0.18) refs.setSensorActive('lidar', true);
				if (t > 0.46) refs.setSensorActive('multispectral', true);
				if (t > 0.72) refs.setSensorActive('thermal', true);
				map.jumpTo({
					center: path.center,
					zoom: 15.2,
					pitch: 50 + eased * 8,
					bearing: -24 + eased * 28
				});
			}
		},

		{
			id: 'bottleneck',
			title: 'The Interpretation Bottleneck',
			subtitle: '55 mapped anomalies, many layers, expert judgement',
			caption: 'The hard part is not just collecting data. It is interpreting it.',
			presenterNote:
				'The Weesp report documents 55 anomalies. They include likely castle walls, moat traces, possible ditches, wall debris, and disturbances. This is expert visual interpretation across many layers, and it does not scale easily.',
			showTelemetry: false,
			...at(8),
			enter: () => {
				resetVisuals();
				droneLayer.setVisibility({ drone: false, path: true, particles: false, finding: false });
				droneLayer.setSiteModelVisible(true);
				droneLayer.setProgress(1);
				map.jumpTo({ center: path.center, zoom: 15.7, pitch: 48, bearing: 8 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				if (t > 0.3) refs.setDetectionVisible('foundation', true);
				if (t > 0.5) refs.setDetectionVisible('wall', true);
				if (t > 0.7) refs.setDetectionVisible('pit', true);
				map.jumpTo({
					center: path.center,
					zoom: 15.7 + eased * 0.5,
					pitch: 48,
					bearing: 8 + eased * 18
				});
			}
		},

		{
			id: 'droneml',
			title: 'Layer Comparison: The Core',
			subtitle: 'Visual evidence for archaeological anomaly detection',
			caption: 'For the demo, the layer stack is enough to explain the signal.',
			presenterNote:
				'For this demo we skip heavy processing and compare the georeferenced image layers directly. LiDAR shows micro-relief, multispectral shows vegetation stress, thermal shows heat-retention contrast, and the probability raster adds numeric inspection.',
			showTelemetry: false,
			...at(8),
			enter: () => {
				resetVisuals();
				refs.setSurveyBox(true);
				droneLayer.setVisibility({ drone: false, path: true, particles: false, finding: false });
				droneLayer.setSiteModelVisible(true);
				droneLayer.setProgress(1);
				map.jumpTo({ center: path.center, zoom: 16.0, pitch: 52, bearing: -30 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				refs.setSplitReveal(eased);
				if (t > 0.42) refs.setDetectionVisible('foundation', true);
				if (t > 0.64) refs.setDetectionVisible('wall', true);
				map.jumpTo({ center: path.center, zoom: 16.0, pitch: 52, bearing: -30 + eased * 24 });
			}
		},

		{
			id: 'ml',
			title: 'How Layer Interpretation Works',
			subtitle: 'LiDAR + NDVI + thermal + probability',
			caption: 'Fast visual toggling keeps the archaeological interpretation in the loop.',
			presenterNote:
				'The expert compares physical signals rather than trusting one layer. A wall may appear as thermal contrast, vegetation stress, and micro-topography; a moat can show different moisture, relief, or heat capacity signatures.',
			showTelemetry: false,
			...at(9),
			enter: () => {
				resetVisuals();
				refs.setSurveyBox(true);
				droneLayer.setVisibility({ drone: false, path: true, particles: false, finding: false });
				droneLayer.setSiteModelVisible(true);
				droneLayer.setProgress(1);
				map.jumpTo({ center: path.center, zoom: 16.25, pitch: 44, bearing: 18 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				refs.setSplitReveal(eased);
				if (t > 0.32) refs.setDetectionVisible('foundation', true);
				if (t > 0.58) refs.setDetectionVisible('wall', true);
				if (t > 0.78) refs.setDetectionVisible('pit', true);
				map.jumpTo({
					center: path.center,
					zoom: 16.25,
					pitch: 44 + eased * 10,
					bearing: 18 - eased * 18
				});
			}
		},

		{
			id: 'software',
			title: 'CoeusAI And Pycoeus',
			subtitle: 'A QGIS interface and a reusable Python core',
			caption: 'Usable for researchers. Reusable for pipelines.',
			presenterNote:
				'CoeusAI is the QGIS plugin that makes the workflow accessible inside a familiar open-source GIS. Pycoeus is the command-line and Python package behind it. This separation is important: user interface for researchers, reusable analytical core for infrastructure.',
			showTelemetry: false,
			...at(8),
			enter: () => {
				resetVisuals();
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: path.center, zoom: 13.2, pitch: 24, bearing: 0 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				map.jumpTo({
					center: path.center,
					zoom: 13.2 + eased * 0.7,
					pitch: 24,
					bearing: eased * 12
				});
			}
		},

		{
			id: 'atlas',
			title: 'DroneATLAS: The Research Platform',
			subtitle: 'A polished environment for drone-data analysis',
			caption: 'The multisensor layer workflow becomes a platform experience.',
			presenterNote:
				'DroneATLAS presents this as a researcher-facing platform. The user does not need to think first about code or command-line tools. They bring drone imagery, organize the layers, process the data, run analysis, and inspect results spatially.',
			showTelemetry: false,
			...at(8),
			enter: () => {
				resetVisuals();
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: path.center, zoom: 12.2, pitch: 18, bearing: -10 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				map.jumpTo({
					center: path.center,
					zoom: 12.2 + eased * 0.6,
					pitch: 18 + eased * 6,
					bearing: -10 + eased * 10
				});
			}
		},

		{
			id: 'process',
			title: 'Drop, Stack, Compare',
			subtitle: 'Drone imagery becomes a geospatial evidence stack',
			caption: 'Upload image layers, align them, and inspect the site visually.',
			presenterNote:
				'This is the lightweight product workflow for the demo: researchers add drone-derived images, DroneATLAS organizes them as map layers, and the archaeologist compares visual signals by switching and blending layers.',
			showTelemetry: false,
			...at(9),
			enter: () => {
				resetVisuals();
				refs.setSurveyBox(true);
				droneLayer.setVisibility({ drone: true, path: true, particles: true, finding: false });
				droneLayer.setProgress(0.25);
				droneLayer.setParticleIntensity(0.25);
				map.jumpTo({ center: path.center, zoom: 15.4, pitch: 54, bearing: -26 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				refs.setSensorStackProgress(eased);
				refs.setSplitReveal(Math.max(0, (t - 0.35) / 0.6));
				droneLayer.setProgress((0.25 + eased * 0.45) % 1);
				droneLayer.setParticleIntensity(0.25 + eased * 0.45);
				if (t > 0.18) refs.setSensorActive('rgb', true);
				if (t > 0.34) refs.setSensorActive('lidar', true);
				if (t > 0.5) refs.setSensorActive('multispectral', true);
				if (t > 0.72) refs.setSensorActive('thermal', true);
				map.jumpTo({
					center: path.center,
					zoom: 15.4 + eased * 0.8,
					pitch: 54,
					bearing: -26 + eased * 34
				});
			},
			exit: () => droneLayer.setParticleIntensity(0)
		},

		{
			id: 'explore',
			title: 'Explore The Site',
			subtitle: 'The map becomes the research workspace',
			caption: 'Now the platform moves from pipeline to spatial exploration.',
			presenterNote:
				'At this point the presentation becomes cinematic. We move into the site, the drone flies the survey path, and the layers become spatial objects on the map. The goal is to make the scientific workflow visible and memorable.',
			showTelemetry: true,
			...at(14),
			enter: () => {
				resetVisuals();
				refs.setSurveyBox(true);
				refs.setSensorStackProgress(1);
				droneLayer.setVisibility({ drone: true, path: true, particles: true, finding: false });
				droneLayer.setProgress(0);
				droneLayer.setParticleIntensity(0.45);
				map.jumpTo({ center: path.center, zoom: 16.0, pitch: 60, bearing: -24 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				const sample = samplePath(path, eased);
				droneLayer.setProgress(eased);
				droneLayer.setParticleIntensity(0.35 + Math.sin(t * Math.PI) * 0.35);
				refs.setTelemetry({
					altitude: sample.alt,
					speed: 6.5 + Math.sin(t * Math.PI) * 2,
					coverageKm2: eased * 0.42,
					detections: Math.floor(eased * 55)
				});
				map.jumpTo({
					center: [sample.lng, sample.lat],
					zoom: 16.55,
					pitch: 62,
					bearing: -24 + eased * 64
				});
			},
			exit: () => droneLayer.setParticleIntensity(0)
		},

		{
			id: 'insight',
			title: 'From Layers To Archaeological Insight',
			subtitle: 'A visual evidence stack for expert interpretation',
			caption: 'The layer stack shows where buried signals may line up.',
			presenterNote:
				'The layer stack does not declare archaeological truth. It makes different physical signals visible in one place so expert interpretation can focus on areas where LiDAR, multispectral, thermal, and probability evidence line up.',
			showTelemetry: true,
			...at(14),
			enter: () => {
				resetVisuals();
				refs.setSurveyBox(true);
				refs.setSensorStackProgress(1);
				droneLayer.setVisibility({ drone: true, path: true, particles: false, finding: false });
				droneLayer.setSiteModelVisible(false);
				droneLayer.setProgress(1);
				const center = path.center;
				map.jumpTo({ center, zoom: 17.05, pitch: 66, bearing: -28 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				const center = path.center;
				const analysing = t > 0.08 && t < 0.44;
				refs.setAnalysisPopup(analysing);
				if (t >= 0.44) {
					droneLayer.setSiteModelVisible(true);
					refs.setDetectionVisible('foundation', true);
				}
				if (t >= 0.56) refs.setDetectionVisible('wall', true);
				if (t >= 0.68) refs.setDetectionVisible('pit', true);
				refs.setTelemetry({ altitude: 72, speed: 0, coverageKm2: 0.42, detections: 55 });
				map.jumpTo({
					center,
					zoom: 17.05,
					pitch: 66 + Math.sin(t * Math.PI) * 4,
					bearing: -28 + eased * 300
				});
			},
			exit: () => refs.setAnalysisPopup(false)
		}
	];
}

function lerpLngLat(a: [number, number], b: [number, number], t: number): [number, number] {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
