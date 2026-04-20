import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import type { FlightPath } from './path';
import { samplePath } from './path';

// MapLibre uses Mercator coordinates internally. We convert lng/lat/alt to a
// scene-local space using maplibregl.MercatorCoordinate, then build a model
// transform passed into the custom layer's render call.

const MODEL_ALT_SCALE = 1; // altitude in meters → world units (mercator scaled)

interface DroneLayerOptions {
	path: FlightPath;
	id?: string;
}

export class DroneLayer implements maplibregl.CustomLayerInterface {
	id: string;
	type: 'custom' = 'custom';
	renderingMode: '3d' = '3d';

	private path: FlightPath;
	private map!: maplibregl.Map;
	private camera = new THREE.Camera();
	private scene = new THREE.Scene();
	private renderer!: THREE.WebGLRenderer;
	private drone!: THREE.Group;
	private pathLine!: THREE.Line;
	private pathDrawn!: THREE.Line;
	private particles!: THREE.Points;
	private particleData!: { age: Float32Array; maxAge: Float32Array };
	private modelOrigin!: maplibregl.MercatorCoordinate;
	private modelScale!: number;

	// Public state controlled by the timeline
	public progress = 0; // 0..1 along the path
	public showDrone = false;
	public showPath = false;
	public showParticles = false;
	public particleIntensity = 0; // 0..1
	private lastSpawnIdx = -1;

	constructor(opts: DroneLayerOptions) {
		this.id = opts.id ?? 'drone-3d';
		this.path = opts.path;
	}

	onAdd(map: maplibregl.Map, gl: WebGLRenderingContext) {
		this.map = map;

		// Scene origin: first path point at sea level. Altitudes are added in meters.
		const first = this.path.points[0];
		this.modelOrigin = maplibregl.MercatorCoordinate.fromLngLat(
			{ lng: first.lng, lat: first.lat },
			0
		);
		this.modelScale = this.modelOrigin.meterInMercatorCoordinateUnits();

		this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
		const key = new THREE.DirectionalLight(0xffffff, 1.0);
		key.position.set(1, 2, 3);
		this.scene.add(key);
		const rim = new THREE.DirectionalLight(0x66ccff, 0.5);
		rim.position.set(-2, 1, -1);
		this.scene.add(rim);

		this.drone = this.buildDrone();
		this.drone.visible = false;
		this.scene.add(this.drone);

		const fullGeo = new THREE.BufferGeometry();
		const fullPos = this.pathToLocalPositions(this.path.points.length);
		fullGeo.setAttribute('position', new THREE.BufferAttribute(fullPos, 3));
		this.pathLine = new THREE.Line(
			fullGeo,
			new THREE.LineBasicMaterial({ color: 0x39d2ff, transparent: true, opacity: 0.18 })
		);
		this.pathLine.visible = false;
		this.scene.add(this.pathLine);

		const drawnGeo = new THREE.BufferGeometry();
		drawnGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.path.points.length * 3), 3));
		drawnGeo.setDrawRange(0, 0);
		this.pathDrawn = new THREE.Line(
			drawnGeo,
			new THREE.LineBasicMaterial({ color: 0x39d2ff, transparent: true, opacity: 0.95, linewidth: 2 })
		);
		this.pathDrawn.visible = false;
		this.scene.add(this.pathDrawn);

		this.particles = this.buildParticles();
		this.particles.visible = false;
		this.scene.add(this.particles);

		this.renderer = new THREE.WebGLRenderer({
			canvas: map.getCanvas(),
			context: gl as WebGL2RenderingContext,
			antialias: true
		});
		this.renderer.autoClear = false;
	}

	render(_gl: WebGLRenderingContext | WebGL2RenderingContext, options: maplibregl.CustomRenderMethodInput) {
		this.updateProgressVisuals();
		this.tickParticles();

		const m = new THREE.Matrix4().fromArray(Array.from(options.modelViewProjectionMatrix as ArrayLike<number>));
		const o = this.modelOrigin;
		const s = this.modelScale;
		const t = new THREE.Matrix4()
			.makeTranslation(o.x, o.y, o.z)
			.scale(new THREE.Vector3(s, -s, s));
		this.camera.projectionMatrix = m.multiply(t);

		this.renderer.resetState();
		this.renderer.render(this.scene, this.camera);
		this.map.triggerRepaint();
	}

	onRemove() {
		this.scene.clear();
		this.renderer?.dispose();
	}

	// --- Public API --------------------------------------------------------

	setProgress(p: number) {
		this.progress = Math.max(0, Math.min(1, p));
	}

	setVisibility(opts: { drone?: boolean; path?: boolean; particles?: boolean }) {
		if (opts.drone !== undefined) this.showDrone = opts.drone;
		if (opts.path !== undefined) this.showPath = opts.path;
		if (opts.particles !== undefined) this.showParticles = opts.particles;
	}

	setParticleIntensity(v: number) {
		this.particleIntensity = Math.max(0, Math.min(1, v));
	}

	getDronePosition() {
		return samplePath(this.path, this.progress);
	}

	// --- Internals ---------------------------------------------------------

	private buildDrone(): THREE.Group {
		const g = new THREE.Group();
		// Body (carbon black)
		const body = new THREE.Mesh(
			new THREE.BoxGeometry(40, 8, 40),
			new THREE.MeshStandardMaterial({ color: 0x111418, metalness: 0.6, roughness: 0.4 })
		);
		g.add(body);
		// Arms in X-shape
		const armMat = new THREE.MeshStandardMaterial({ color: 0x222831, metalness: 0.5, roughness: 0.5 });
		for (const angle of [Math.PI / 4, -Math.PI / 4]) {
			const arm = new THREE.Mesh(new THREE.BoxGeometry(90, 4, 4), armMat);
			arm.rotation.y = angle;
			g.add(arm);
		}
		// Rotors with a faint glow ring
		for (const [x, z] of [
			[32, 32],
			[-32, 32],
			[32, -32],
			[-32, -32]
		]) {
			const motor = new THREE.Mesh(
				new THREE.CylinderGeometry(4, 4, 6, 12),
				new THREE.MeshStandardMaterial({ color: 0x333a44 })
			);
			motor.position.set(x, 4, z);
			g.add(motor);
			const rotor = new THREE.Mesh(
				new THREE.RingGeometry(10, 14, 24),
				new THREE.MeshBasicMaterial({ color: 0x39d2ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
			);
			rotor.rotation.x = -Math.PI / 2;
			rotor.position.set(x, 8, z);
			g.add(rotor);
		}
		// Sensor pod underneath
		const pod = new THREE.Mesh(
			new THREE.SphereGeometry(6, 16, 16),
			new THREE.MeshStandardMaterial({ color: 0x39d2ff, emissive: 0x113344, metalness: 0.8, roughness: 0.2 })
		);
		pod.position.set(0, -8, 0);
		g.add(pod);

		g.scale.setScalar(1.5);
		return g;
	}

	private buildParticles(): THREE.Points {
		const N = 4000;
		const positions = new Float32Array(N * 3);
		const colors = new Float32Array(N * 3);
		const age = new Float32Array(N);
		const maxAge = new Float32Array(N);
		for (let i = 0; i < N; i++) {
			age[i] = Infinity; // dead until spawned
			maxAge[i] = 4 + Math.random() * 4;
		}
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		const mat = new THREE.PointsMaterial({
			size: 14,
			vertexColors: true,
			transparent: true,
			opacity: 0.85,
			depthWrite: false,
			blending: THREE.AdditiveBlending
		});
		this.particleData = { age, maxAge };
		return new THREE.Points(geo, mat);
	}

	private pathToLocalPositions(count: number): Float32Array {
		const arr = new Float32Array(count * 3);
		for (let i = 0; i < count; i++) {
			const p = this.path.points[i];
			const m = maplibregl.MercatorCoordinate.fromLngLat({ lng: p.lng, lat: p.lat }, p.alt);
			arr[i * 3 + 0] = (m.x - this.modelOrigin.x) / this.modelScale;
			arr[i * 3 + 1] = -(m.y - this.modelOrigin.y) / this.modelScale;
			arr[i * 3 + 2] = (m.z - this.modelOrigin.z) / this.modelScale;
		}
		return arr;
	}

	private updateProgressVisuals() {
		this.drone.visible = this.showDrone;
		this.pathLine.visible = this.showPath;
		this.pathDrawn.visible = this.showPath;

		if (this.showDrone) {
			const sample = samplePath(this.path, this.progress);
			const m = maplibregl.MercatorCoordinate.fromLngLat(
				{ lng: sample.lng, lat: sample.lat },
				sample.alt
			);
			this.drone.position.set(
				(m.x - this.modelOrigin.x) / this.modelScale,
				-(m.y - this.modelOrigin.y) / this.modelScale,
				(m.z - this.modelOrigin.z) / this.modelScale
			);
			this.drone.rotation.set(0, (-sample.bearing * Math.PI) / 180, 0);
			// Subtle bobbing
			this.drone.position.y += Math.sin(performance.now() * 0.005) * 1.5;
		}

		if (this.showPath) {
			const total = this.path.points.length;
			const drawn = Math.max(2, Math.floor(this.progress * total));
			const fullPos = (this.pathLine.geometry.attributes.position as THREE.BufferAttribute).array as Float32Array;
			const drawnAttr = this.pathDrawn.geometry.attributes.position as THREE.BufferAttribute;
			const drawnArr = drawnAttr.array as Float32Array;
			drawnArr.set(fullPos.subarray(0, drawn * 3));
			drawnAttr.needsUpdate = true;
			this.pathDrawn.geometry.setDrawRange(0, drawn);
		}
	}

	private tickParticles() {
		this.particles.visible = this.showParticles && this.particleIntensity > 0.01;
		if (!this.particles.visible) return;
		const dt = 0.016;
		const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
		const colors = this.particles.geometry.attributes.color as THREE.BufferAttribute;
		const posArr = positions.array as Float32Array;
		const colArr = colors.array as Float32Array;
		const { age, maxAge } = this.particleData;

		// Spawn near the drawn portion of the path
		const drawnIdx = Math.floor(this.progress * this.path.points.length);
		const spawnCount = Math.floor(8 * this.particleIntensity);
		for (let s = 0; s < spawnCount; s++) {
			const i = this.findDeadParticle();
			if (i < 0) break;
			const sampleIdx = Math.max(0, Math.floor(Math.random() * drawnIdx));
			const p = this.path.points[sampleIdx] ?? this.path.points[0];
			const m = maplibregl.MercatorCoordinate.fromLngLat(
				{ lng: p.lng, lat: p.lat },
				p.alt + Math.random() * 30
			);
			posArr[i * 3 + 0] = (m.x - this.modelOrigin.x) / this.modelScale + (Math.random() - 0.5) * 30;
			posArr[i * 3 + 1] = -(m.y - this.modelOrigin.y) / this.modelScale + (Math.random() - 0.5) * 30;
			posArr[i * 3 + 2] = (m.z - this.modelOrigin.z) / this.modelScale;
			// Color by simulated PM2.5: green → yellow → red
			const pm = Math.random();
			colArr[i * 3 + 0] = pm < 0.5 ? pm * 2 : 1;
			colArr[i * 3 + 1] = pm < 0.5 ? 1 : 1 - (pm - 0.5) * 2;
			colArr[i * 3 + 2] = 0.2;
			age[i] = 0;
		}

		// Age + drift
		for (let i = 0; i < age.length; i++) {
			if (age[i] >= maxAge[i]) continue;
			age[i] += dt;
			posArr[i * 3 + 0] += Math.sin(performance.now() * 0.001 + i) * 0.05;
			posArr[i * 3 + 1] += Math.cos(performance.now() * 0.001 + i) * 0.05;
			posArr[i * 3 + 2] += 0.3; // rise
			if (age[i] >= maxAge[i]) {
				// move offscreen
				posArr[i * 3 + 0] = posArr[i * 3 + 1] = posArr[i * 3 + 2] = -1e6;
			}
		}

		positions.needsUpdate = true;
		colors.needsUpdate = true;
		this.lastSpawnIdx = drawnIdx;
	}

	private findDeadParticle(): number {
		const { age, maxAge } = this.particleData;
		for (let attempts = 0; attempts < 30; attempts++) {
			const i = Math.floor(Math.random() * age.length);
			if (age[i] >= maxAge[i]) return i;
		}
		return -1;
	}
}
