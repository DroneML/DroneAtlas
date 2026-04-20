import type { Beat } from './timeline';
import { easing } from './timeline';
import type { Map as MaplibreMap } from 'maplibre-gl';
import type { DroneLayer } from './DroneLayer';
import type { FlightPath } from './path';
import { samplePath } from './path';

export interface SceneRefs {
	map: MaplibreMap;
	droneLayer: DroneLayer;
	path: FlightPath;
	setColdOpenVisible: (v: boolean) => void;
	setSensorActive: (id: string, active: boolean) => void;
	setDetectionVisible: (id: string, visible: boolean) => void;
	setEndCardVisible: (v: boolean) => void;
	setBeatTitle: (t: string) => void;
	setCaption: (c: string) => void;
	setTelemetry: (t: { altitude?: number; speed?: number; coverageKm2?: number; detections?: number }) => void;
}

export function buildBeats(refs: SceneRefs): Beat[] {
	const { map, droneLayer, path } = refs;
	const c = path.center;

	return [
		// 0:00–0:30 Cold open
		{
			id: 'cold-open',
			title: 'Cold open',
			caption: '',
			start: 0,
			duration: 30,
			enter: () => {
				refs.setColdOpenVisible(true);
				refs.setBeatTitle('');
				refs.setCaption('');
				map.jumpTo({ center: c, zoom: 3, pitch: 0, bearing: 0 });
				droneLayer.setVisibility({ drone: false, path: false, particles: false });
			},
			tick: (_, t) => {
				// Slow cinematic zoom from continent to region
				const zoom = 3 + easing.easeInOut(t) * 9; // 3 → 12
				map.jumpTo({ center: c, zoom, pitch: easing.easeInOut(t) * 30, bearing: easing.easeInOut(t) * -20 });
			},
			exit: () => refs.setColdOpenVisible(false)
		},

		// 0:30–1:15 Drone arrival + path tracing
		{
			id: 'drone-arrival',
			title: 'A drone takes flight',
			caption: 'A single autonomous drone — eight passes, twelve square kilometers.',
			start: 30,
			duration: 45,
			enter: () => {
				refs.setBeatTitle('FLIGHT INITIATED');
				refs.setCaption('A single autonomous drone — eight passes, twelve square kilometers.');
				droneLayer.setVisibility({ drone: true, path: true, particles: false });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				droneLayer.setProgress(eased);
				const sample = samplePath(path, eased);
				const zoom = 13 + eased * 2;
				map.jumpTo({
					center: [sample.lng, sample.lat],
					zoom,
					pitch: 60,
					bearing: -20 + eased * 40
				});
				const speed = 8 + Math.sin(t * Math.PI) * 2;
				refs.setTelemetry({
					altitude: sample.alt,
					speed,
					coverageKm2: eased * 12.4,
					detections: 0
				});
			}
		},

		// 1:15–2:30 Sensor reveal
		{
			id: 'sensors',
			title: 'Multi-sensor capture',
			caption: 'Four sensors. One pass. The map becomes a stack.',
			start: 75,
			duration: 75,
			enter: () => {
				refs.setBeatTitle('SENSOR ARRAY ONLINE');
				refs.setCaption('Four sensors. One pass. The map becomes a stack.');
				droneLayer.setVisibility({ drone: true, path: true, particles: false });
			},
			tick: (_, t) => {
				droneLayer.setProgress(0.4 + t * 0.3);
				// Activate sensors progressively
				if (t > 0.05) refs.setSensorActive('rgb', true);
				if (t > 0.25) refs.setSensorActive('thermal', true);
				if (t > 0.5) refs.setSensorActive('multispectral', true);
				if (t > 0.75) refs.setSensorActive('lidar', true);

				const sample = samplePath(path, 0.4 + t * 0.3);
				map.jumpTo({
					center: [sample.lng, sample.lat],
					zoom: 14.5,
					pitch: 65,
					bearing: 20 + t * 60
				});
				refs.setTelemetry({
					altitude: sample.alt,
					speed: 8.2,
					coverageKm2: 4 + t * 4,
					detections: Math.floor(t * 80)
				});
			}
		},

		// 2:30–3:30 ML detections
		{
			id: 'ml-findings',
			title: 'ML inference layer',
			caption: 'Real-time inference surfaces what the human eye misses.',
			start: 150,
			duration: 60,
			enter: () => {
				refs.setBeatTitle('ML INFERENCE');
				refs.setCaption('Real-time inference surfaces what the human eye misses.');
			},
			tick: (_, t) => {
				droneLayer.setProgress(0.7 + t * 0.15);
				if (t > 0.15) refs.setDetectionVisible('vegetation', true);
				if (t > 0.4) refs.setDetectionVisible('structure', true);
				if (t > 0.65) refs.setDetectionVisible('anomaly', true);

				const sample = samplePath(path, 0.7 + t * 0.15);
				map.jumpTo({
					center: [sample.lng, sample.lat],
					zoom: 15.5 + t * 0.5,
					pitch: 70,
					bearing: 80 - t * 40
				});
				refs.setTelemetry({
					altitude: sample.alt,
					speed: 7.6,
					coverageKm2: 8 + t * 2,
					detections: 80 + Math.floor(t * 767)
				});
			}
		},

		// 3:30–4:15 Air particles
		{
			id: 'particles',
			title: 'Atmospheric capture',
			caption: 'A side-effect becomes a discovery: airborne particulate mapped along every meter flown.',
			start: 210,
			duration: 45,
			enter: () => {
				refs.setBeatTitle('ATMOSPHERIC CAPTURE');
				refs.setCaption('A side-effect becomes a discovery: airborne particulate mapped along every meter flown.');
				droneLayer.setVisibility({ drone: true, path: true, particles: true });
			},
			tick: (_, t) => {
				droneLayer.setProgress(0.85 + t * 0.15);
				droneLayer.setParticleIntensity(easing.easeOut(Math.min(1, t * 1.5)));
				const sample = samplePath(path, 0.85 + t * 0.15);
				map.jumpTo({
					center: [sample.lng, sample.lat],
					zoom: 15 - t * 1.5,
					pitch: 65 - t * 15,
					bearing: 40 + t * 30
				});
				refs.setTelemetry({
					altitude: sample.alt,
					speed: 7.2,
					coverageKm2: 10 + t * 2.4,
					detections: 847
				});
			}
		},

		// 4:15–5:00 Zoom out + end card
		{
			id: 'finale',
			title: 'Mission complete',
			caption: '',
			start: 255,
			duration: 45,
			enter: () => {
				refs.setBeatTitle('MISSION COMPLETE');
				refs.setCaption('');
				droneLayer.setProgress(1);
				droneLayer.setVisibility({ drone: true, path: true, particles: true });
			},
			tick: (_, t) => {
				droneLayer.setParticleIntensity(1 - t);
				const eased = easing.easeInOut(t);
				const zoom = 13.5 - eased * 4;
				map.jumpTo({
					center: c,
					zoom,
					pitch: 60 - eased * 60,
					bearing: 70 + eased * 20
				});
				refs.setTelemetry({
					altitude: 0,
					speed: 0,
					coverageKm2: 12.4,
					detections: 847
				});
				if (t > 0.4) refs.setEndCardVisible(true);
			},
			exit: () => {
				refs.setEndCardVisible(false);
			}
		}
	];
}
