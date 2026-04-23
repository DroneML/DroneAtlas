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
	setSensorActive: (id: string, active: boolean) => void;
	setDetectionVisible: (id: string, visible: boolean) => void;
	setTelemetry: (t: {
		altitude?: number;
		speed?: number;
		coverageKm2?: number;
		detections?: number;
	}) => void;
	setSensorStackProgress: (p: number) => void; // 0..1 for slide 5
	setSplitReveal: (p: number) => void; // 0..1 for slide 6 (0=RGB only, 1=full ML)
	setSurveyBox: (visible: boolean) => void;
}

const VELDHOVEN: [number, number] = [5.4053, 51.4203];
const OSTIA: [number, number] = [12.2916, 41.7558];
const VELUWE: [number, number] = [5.8372, 52.0833];

// Slide indices are implicit in the array order; `start` is the cumulative
// offset used only for legacy progress math. Since slides now pause at their
// end, "start" does not strictly matter for UX but stays consistent so that
// beatIndex lookup by time still works.
export function buildBeats(refs: SceneRefs): Beat[] {
	const { map, droneLayer, path } = refs;

	// Running offset helper so we don't hand-calculate times.
	let offset = 0;
	const at = (duration: number) => {
		const start = offset;
		offset += duration;
		return { start, duration };
	};

	return [
		// 1 — Title
		{
			id: 'title',
			title: 'DroneAtlas',
			subtitle: 'Seeing what the ground hides',
			caption: '',
			presenterNote:
				"Welcome. DroneAtlas helps researchers turn terabytes of drone imagery into explorable insight. I'll walk through one real site — an archaeological survey at Veldhoven — in about five minutes.",
			showTelemetry: false,
			...at(8),
			enter: () => {
				refs.setSurveyBox(false);
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: VELDHOVEN, zoom: 2.5, pitch: 0, bearing: 0 });
			},
			tick: (_, t) => {
				// Slow continent drift. Freezes at t=1.
				const eased = easing.easeInOut(t);
				map.jumpTo({
					center: VELDHOVEN,
					zoom: 2.5 + eased * 0.6,
					pitch: eased * 12,
					bearing: eased * -6
				});
			}
		},

		// 2 — The problem
		{
			id: 'problem',
			title: 'The Problem',
			subtitle: 'Terabytes. Many sensors. No easy view.',
			caption: 'Drones capture rich data. Turning it into insight is the hard part.',
			presenterNote:
				'A single drone mission produces RGB, thermal, multispectral, and LiDAR — often tens of gigabytes. Today most of that sits in folders no one opens. DroneAtlas is built to make those layers explorable together.',
			showTelemetry: false,
			...at(20),
			enter: () => {
				refs.setSurveyBox(false);
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: VELDHOVEN, zoom: 3.1, pitch: 12, bearing: -6 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				map.jumpTo({
					center: VELDHOVEN,
					zoom: 3.1 + eased * 1.5,
					pitch: 12 + eased * 10,
					bearing: -6 + eased * 10
				});
			}
		},

		// 3 — The site (Veldhoven)
		{
			id: 'site',
			title: 'The Site',
			subtitle: 'Veldhoven, Netherlands',
			caption: 'A suspected Roman settlement under active farmland.',
			presenterNote:
				"Veldhoven — a quiet town in the southern Netherlands. Beneath this field, historians suspect a Roman-era foundation. It's too subtle to see from the ground and the farmland is still in active use.",
			showTelemetry: false,
			...at(25),
			enter: () => {
				refs.setSurveyBox(false);
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: VELDHOVEN, zoom: 4.5, pitch: 22, bearing: 4 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				// Cinematic pin drop: zoom 4.5 → 16 with gentle pitch rise.
				map.jumpTo({
					center: VELDHOVEN,
					zoom: 4.5 + eased * 11.5,
					pitch: 22 + eased * 28,
					bearing: 4 - eased * 14
				});
				if (t > 0.85) refs.setSurveyBox(true);
			}
		},

		// 4 — The flight
		{
			id: 'flight',
			title: 'The Flight',
			subtitle: '42-minute autonomous survey',
			caption: 'Four sensors, one pass.',
			presenterNote:
				"The drone flies a lawn-mower pattern at 80m, capturing RGB, thermal, LiDAR, and multispectral on every pass. You're seeing a synthetic trace of the path — the real flight produces about 18 GB across the four sensors.",
			showTelemetry: true,
			...at(35),
			enter: () => {
				refs.setSurveyBox(true);
				droneLayer.setVisibility({ drone: true, path: true, particles: false, finding: false });
				droneLayer.setProgress(0);
				map.jumpTo({ center: path.center, zoom: 16, pitch: 55, bearing: -20 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				droneLayer.setProgress(eased);
				const sample = samplePath(path, eased);
				map.jumpTo({
					center: [sample.lng, sample.lat],
					zoom: 16.5,
					pitch: 62,
					bearing: -20 + eased * 40
				});
				refs.setTelemetry({
					altitude: sample.alt,
					speed: 8 + Math.sin(t * Math.PI) * 2,
					coverageKm2: eased * 0.36,
					detections: Math.floor(eased * 120)
				});
			},
			exit: () => {
				droneLayer.setProgress(1);
			}
		},

		// 5 — The stack
		{
			id: 'stack',
			title: 'The Stack',
			subtitle: 'One mission, four ways of seeing',
			caption: 'RGB, thermal, LiDAR, ML prediction — one mission becomes four maps.',
			presenterNote:
				"Every sensor shows the field differently. RGB is how you'd see it. Thermal exposes soil moisture. LiDAR shows micro-topography. The ML prediction is where those signals get combined into a single confidence surface.",
			showTelemetry: false,
			...at(40),
			enter: () => {
				refs.setSurveyBox(true);
				droneLayer.setVisibility({ drone: false, path: true, particles: false, finding: false });
				droneLayer.setProgress(1);
				map.jumpTo({ center: path.center, zoom: 16.8, pitch: 50, bearing: 20 });
			},
			tick: (_, t) => {
				refs.setSensorStackProgress(t);
				if (t > 0.08) refs.setSensorActive('rgb', true);
				if (t > 0.3) refs.setSensorActive('thermal', true);
				if (t > 0.55) refs.setSensorActive('lidar', true);
				if (t > 0.78) refs.setSensorActive('ml', true);
				// Gentle bearing orbit to sell the 3D feel of the stack.
				map.jumpTo({
					center: path.center,
					zoom: 16.8,
					pitch: 50,
					bearing: 20 + t * 25
				});
			}
		},

		// 6 — Human vs. machine
		{
			id: 'insight',
			title: 'Human vs. Machine',
			subtitle: 'The ground keeps its secrets',
			caption: 'Until inference runs.',
			presenterNote:
				"To a person, it's an ordinary field. Run the ML model over the same tile and three anomaly clusters light up — matching what we'd expect from a Roman foundation footprint.",
			showTelemetry: false,
			...at(35),
			enter: () => {
				refs.setSurveyBox(true);
				refs.setSplitReveal(0);
				droneLayer.setVisibility({ drone: false, path: true, particles: false, finding: false });
				map.jumpTo({ center: path.center, zoom: 17, pitch: 40, bearing: 45 });
			},
			tick: (_, t) => {
				refs.setSplitReveal(easing.easeInOut(t));
				if (t > 0.35) refs.setDetectionVisible('foundation', true);
				if (t > 0.6) refs.setDetectionVisible('wall', true);
				if (t > 0.82) refs.setDetectionVisible('pit', true);
			}
		},

		// 7 — Orbit the finding
		{
			id: 'finding',
			title: 'The Finding',
			subtitle: 'A 2,000-year-old foundation',
			caption: 'Mapped in a morning.',
			presenterNote:
				'This is the actual ML prediction raster, extruded so peaks are the highest-confidence pixels. The camera is orbiting Veldhoven — not a render farm — and the drone is hovering 30m above the mesh for scale.',
			showTelemetry: false,
			...at(40),
			enter: () => {
				refs.setSurveyBox(false);
				refs.setSplitReveal(1);
				droneLayer.setVisibility({ drone: true, path: false, particles: false, finding: true });
				const center = droneLayer.getFindingCenter() ?? path.center;
				map.jumpTo({ center, zoom: 17.2, pitch: 65, bearing: 0 });
			},
			tick: (_, t) => {
				const center = droneLayer.getFindingCenter() ?? path.center;
				const bearing = t * 360;
				const pitch = 60 + Math.sin(t * Math.PI) * 8;
				map.jumpTo({ center, zoom: 17.2, pitch, bearing });
				// Float drone above the mesh centre (progress = 0 puts it at path start;
				// we instead drive it along a tiny circular hover near the centre).
				const hoverT = (t * 0.2 + 0.4) % 1;
				droneLayer.setProgress(hoverT);
			}
		},

		// 8 — One platform, many maps
		{
			id: 'platform',
			title: 'One Platform',
			subtitle: 'Archaeology · Heritage · Ecology',
			caption: 'Same toolkit. Different domains.',
			presenterNote:
				"DroneAtlas isn't Veldhoven-specific. The same pipeline runs on Ostia Antica — Roman heritage near Rome — and the Veluwe heathland for ecological monitoring. Adding a site is a matter of loading its COGs.",
			showTelemetry: false,
			...at(25),
			enter: () => {
				refs.setSurveyBox(false);
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: VELDHOVEN, zoom: 10, pitch: 30, bearing: 0 });
			},
			tick: (_, t) => {
				// Three stops within [0,1]: Veldhoven → Ostia → Veluwe.
				if (t < 0.33) {
					const k = t / 0.33;
					map.jumpTo({
						center: lerpLngLat(VELDHOVEN, OSTIA, easing.easeInOut(k)),
						zoom: 10 - k * 3,
						pitch: 30,
						bearing: k * 15
					});
				} else if (t < 0.66) {
					const k = (t - 0.33) / 0.33;
					map.jumpTo({
						center: lerpLngLat(OSTIA, VELUWE, easing.easeInOut(k)),
						zoom: 7 + k * 3,
						pitch: 30,
						bearing: 15 + k * -15
					});
				} else {
					const k = (t - 0.66) / 0.34;
					map.jumpTo({
						center: VELUWE,
						zoom: 10 + k * 1.2,
						pitch: 30,
						bearing: 0
					});
				}
			}
		},

		// 9 — Close
		{
			id: 'close',
			title: 'DroneAtlas',
			subtitle: 'Making drone data explorable',
			caption: '',
			presenterNote:
				"That's the tour. Questions about the pipeline, the ML models, or onboarding a new site are all fair game.",
			showTelemetry: false,
			...at(12),
			enter: () => {
				refs.setSurveyBox(false);
				droneLayer.setVisibility({ drone: false, path: false, particles: false, finding: false });
				map.jumpTo({ center: VELDHOVEN, zoom: 5, pitch: 0, bearing: 0 });
			},
			tick: (_, t) => {
				const eased = easing.easeInOut(t);
				map.jumpTo({
					center: VELDHOVEN,
					zoom: 5 - eased * 2,
					pitch: 0,
					bearing: eased * 10
				});
			}
		}
	];
}

function lerpLngLat(a: [number, number], b: [number, number], t: number): [number, number] {
	return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
