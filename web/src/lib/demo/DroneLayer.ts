import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
import type { FlightPath } from './path';
import { samplePath } from './path';
import { plasmaColor, type Heightfield } from './mlHeightfield';

// MapLibre uses Mercator coordinates internally. We convert lng/lat/alt to a
// scene-local space using maplibregl.MercatorCoordinate, then build a model
// transform passed into the custom layer's render call.

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
	private siteModel: THREE.Group | null = null;
	private modelOrigin!: maplibregl.MercatorCoordinate;
	private modelScale!: number;

	private findingMesh: THREE.Mesh | null = null;
	private findingCenter: [number, number] | null = null;

	// Public state controlled by the timeline
	public progress = 0; // 0..1 along the path
	public showDrone = false;
	public showPath = false;
	public showParticles = false;
	public showFinding = false;
	public showSiteModel = false;
	public particleIntensity = 0; // 0..1

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
		drawnGeo.setAttribute(
			'position',
			new THREE.BufferAttribute(new Float32Array(this.path.points.length * 3), 3)
		);
		drawnGeo.setDrawRange(0, 0);
		this.pathDrawn = new THREE.Line(
			drawnGeo,
			new THREE.LineBasicMaterial({
				color: 0x39d2ff,
				transparent: true,
				opacity: 0.95,
				linewidth: 2
			})
		);
		this.pathDrawn.visible = false;
		this.scene.add(this.pathDrawn);

		this.particles = this.buildParticles();
		this.particles.visible = false;
		this.scene.add(this.particles);

		this.siteModel = this.buildSiteModel(this.path.center, { rotationDeg: -26 });
		this.siteModel.visible = false;
		this.scene.add(this.siteModel);

		this.renderer = new THREE.WebGLRenderer({
			canvas: map.getCanvas(),
			context: gl as WebGL2RenderingContext,
			antialias: true
		});
		this.renderer.autoClear = false;
	}

	render(
		_gl: WebGLRenderingContext | WebGL2RenderingContext,
		options: maplibregl.CustomRenderMethodInput
	) {
		this.updateProgressVisuals();
		this.tickParticles();

		const m = new THREE.Matrix4().fromArray(
			Array.from(options.modelViewProjectionMatrix as ArrayLike<number>)
		);
		const o = this.modelOrigin;
		const s = this.modelScale;
		const t = new THREE.Matrix4().makeTranslation(o.x, o.y, o.z).scale(new THREE.Vector3(s, -s, s));
		this.camera.projectionMatrix = m.multiply(t);

		this.renderer.resetState();
		this.renderer.clearDepth();
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

	setVisibility(opts: {
		drone?: boolean;
		path?: boolean;
		particles?: boolean;
		finding?: boolean;
		siteModel?: boolean;
	}) {
		if (opts.drone !== undefined) this.showDrone = opts.drone;
		if (opts.path !== undefined) this.showPath = opts.path;
		if (opts.particles !== undefined) this.showParticles = opts.particles;
		if (opts.finding !== undefined) this.showFinding = opts.finding;
		if (opts.siteModel !== undefined) this.showSiteModel = opts.siteModel;
	}

	setParticleIntensity(v: number) {
		this.particleIntensity = Math.max(0, Math.min(1, v));
	}

	setFindingMeshVisible(v: boolean) {
		this.showFinding = v;
		if (this.findingMesh) this.findingMesh.visible = v;
	}

	setSiteModelVisible(v: boolean) {
		this.showSiteModel = v;
		if (this.siteModel) this.siteModel.visible = v;
	}

	getDronePosition() {
		return samplePath(this.path, this.progress);
	}

	getFindingCenter(): [number, number] | null {
		return this.findingCenter;
	}

	// Build (or rebuild) the 3D heightfield mesh from a pre-loaded grid.
	setFindingHeightfield(hf: Heightfield, opts: { heightMeters?: number } = {}) {
		// Remove the old mesh if we're rebuilding.
		if (this.findingMesh) {
			this.scene.remove(this.findingMesh);
			this.findingMesh.geometry.dispose();
			(this.findingMesh.material as THREE.Material).dispose();
			this.findingMesh = null;
		}

		const [minLng, minLat, maxLng, maxLat] = hf.bounds;
		const cLng = (minLng + maxLng) / 2;
		const cLat = (minLat + maxLat) / 2;
		this.findingCenter = [cLng, cLat];

		// Width/height of the mesh in meters. meterInMercatorCoordinateUnits
		// at the raster centre gives the conversion factor.
		const originAtBounds = maplibregl.MercatorCoordinate.fromLngLat({ lng: cLng, lat: cLat }, 0);
		const mScale = originAtBounds.meterInMercatorCoordinateUnits();

		const widthMeters =
			((maxLng - minLng) * Math.PI * 6378137 * Math.cos((cLat * Math.PI) / 180)) / 180;
		const heightMeters = ((maxLat - minLat) * Math.PI * 6378137) / 180;
		const displacement = opts.heightMeters ?? 40;

		const geo = new THREE.PlaneGeometry(widthMeters, heightMeters, hf.width - 1, hf.height - 1);

		const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
		const colors = new Float32Array(posAttr.count * 3);
		// PlaneGeometry indexes row 0 at top of the plane (+y). The raster's
		// row 0 is its top (max latitude) too, so direct mapping is correct.
		for (let i = 0; i < posAttr.count; i++) {
			const v = hf.values[i] ?? 0;
			// Displace along z (plane's normal axis after we rotate it flat).
			posAttr.setZ(i, v * displacement);
			const c = plasmaColor(v);
			colors[i * 3] = c[0];
			colors[i * 3 + 1] = c[1];
			colors[i * 3 + 2] = c[2];
		}
		posAttr.needsUpdate = true;
		geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
		geo.computeVertexNormals();

		const mat = new THREE.MeshStandardMaterial({
			vertexColors: true,
			metalness: 0.05,
			roughness: 0.75,
			emissive: new THREE.Color(0x2a0050),
			emissiveIntensity: 0.35,
			transparent: true,
			opacity: 0.92,
			side: THREE.DoubleSide
		});

		const mesh = new THREE.Mesh(geo, mat);
		// PlaneGeometry is in XY plane with normal +Z. We want it flat on the
		// map (normal pointing up in world space), so rotate -90° around X.
		mesh.rotation.x = -Math.PI / 2;

		// Position relative to the scene's model origin.
		const meshOrigin = originAtBounds;
		mesh.position.set(
			(meshOrigin.x - this.modelOrigin.x) / this.modelScale,
			-(meshOrigin.y - this.modelOrigin.y) / this.modelScale,
			(meshOrigin.z - this.modelOrigin.z) / this.modelScale
		);
		// Mesh dimensions were constructed in meters; the scene scale is also
		// meters (modelScale converts meters → mercator). So no extra scale.
		// But we need the mesh's own scale to match modelScale ratio:
		const s = mScale / this.modelScale;
		mesh.scale.setScalar(s);
		mesh.visible = this.showFinding;

		this.scene.add(mesh);
		this.findingMesh = mesh;
	}

	// --- Internals ---------------------------------------------------------

	private buildDrone(): THREE.Group {
		const g = new THREE.Group();
		const body = new THREE.Mesh(
			new THREE.BoxGeometry(40, 8, 40),
			new THREE.MeshStandardMaterial({ color: 0x111418, metalness: 0.6, roughness: 0.4 })
		);
		g.add(body);
		const armMat = new THREE.MeshStandardMaterial({
			color: 0x222831,
			metalness: 0.5,
			roughness: 0.5
		});
		for (const angle of [Math.PI / 4, -Math.PI / 4]) {
			const arm = new THREE.Mesh(new THREE.BoxGeometry(90, 4, 4), armMat);
			arm.rotation.y = angle;
			g.add(arm);
		}
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
				new THREE.MeshBasicMaterial({
					color: 0x39d2ff,
					transparent: true,
					opacity: 0.5,
					side: THREE.DoubleSide
				})
			);
			rotor.rotation.x = -Math.PI / 2;
			rotor.position.set(x, 8, z);
			g.add(rotor);
		}
		const pod = new THREE.Mesh(
			new THREE.SphereGeometry(6, 16, 16),
			new THREE.MeshStandardMaterial({
				color: 0x39d2ff,
				emissive: 0x113344,
				metalness: 0.8,
				roughness: 0.2
			})
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
			age[i] = Infinity;
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

	private buildSiteModel(
		center: [number, number],
		opts: { rotationDeg?: number } = {}
	): THREE.Group {
		const root = new THREE.Group();
		const centerMerc = maplibregl.MercatorCoordinate.fromLngLat(
			{ lng: center[0], lat: center[1] },
			0
		);
		root.position.set(
			(centerMerc.x - this.modelOrigin.x) / this.modelScale,
			-(centerMerc.y - this.modelOrigin.y) / this.modelScale,
			(centerMerc.z - this.modelOrigin.z) / this.modelScale + 1.2
		);
		root.rotation.z = ((opts.rotationDeg ?? 0) * Math.PI) / 180;

		const stoneMat = new THREE.MeshStandardMaterial({
			color: 0xb8aa91,
			emissive: 0x5a4032,
			emissiveIntensity: 0.16,
			metalness: 0.08,
			roughness: 0.72
		});
		const ruinMat = new THREE.MeshStandardMaterial({
			color: 0x8f826e,
			emissive: 0x4d332c,
			emissiveIntensity: 0.18,
			metalness: 0.05,
			roughness: 0.82
		});
		const roofMat = new THREE.MeshStandardMaterial({
			color: 0x4d473c,
			emissive: 0x221c18,
			emissiveIntensity: 0.12,
			metalness: 0.08,
			roughness: 0.78
		});
		const outlineMat = new THREE.LineBasicMaterial({
			color: 0xff2da8,
			transparent: true,
			opacity: 0.96
		});
		const moatMat = new THREE.LineBasicMaterial({
			color: 0x39d2ff,
			transparent: true,
			opacity: 0.78
		});
		const trenchMat = new THREE.LineBasicMaterial({
			color: 0xfff454,
			transparent: true,
			opacity: 0.9
		});
		const ironMat = new THREE.LineBasicMaterial({
			color: 0x242423,
			transparent: true,
			opacity: 0.9
		});

		// Reference drawing: low left service wing, central gate court, tall gatehouse,
		// rear hall with pitched roof, and a broken crenellated wall to the right.
		this.addGabledBuilding(root, -76, -20, 72, 24, 9, 6, stoneMat, roofMat);
		this.addGabledBuilding(root, -24, 4, 48, 32, 13, 7, stoneMat, roofMat);
		this.addGabledBuilding(root, 18, 46, 92, 34, 22, 11, stoneMat, roofMat);
		this.addBox(root, 46, -1, 30, 38, 30, stoneMat);
		this.addCrenellations(root, 46, -1, 30, 38, 30, stoneMat, 6);
		this.addBox(root, 87, -6, 50, 12, 12, ruinMat);
		this.addBox(root, 118, -6, 11, 12, 18, ruinMat);
		this.addCrenellations(root, 87, -6, 50, 12, 12, ruinMat, 7);
		for (const [x, y, h] of [
			[29, -23, 19],
			[63, -23, 22],
			[31, 21, 25],
			[65, 21, 27]
		] as Array<[number, number, number]>) {
			this.addBox(root, x, y, 8, 8, h, stoneMat);
		}

		this.addRectLine(root, -76, -20, 76, 28, 11, outlineMat);
		this.addRectLine(root, -24, 4, 52, 36, 15, outlineMat);
		this.addRectLine(root, 46, -1, 36, 44, 33, outlineMat);
		this.addRectLine(root, 18, 46, 98, 40, 24, outlineMat);
		this.addRectLine(root, 94, -6, 68, 18, 16, outlineMat);

		for (const x of [30, 36, 42, 48, 54, 60]) {
			this.addLine(root, [x, -27, 0.8], [x, -27, 18], ironMat);
		}
		this.addLine(root, [28, -27, 9], [62, -27, 9], ironMat);
		this.addLine(root, [28, -27, 18], [45, -27, 26], ironMat);
		this.addLine(root, [62, -27, 18], [45, -27, 26], ironMat);
		this.addPolygonLine(
			root,
			[
				[-135, 72],
				[-42, 118],
				[98, 96],
				[142, 36],
				[128, -112],
				[-26, -150],
				[-138, -82],
				[-162, 12]
			],
			2.5,
			moatMat
		);
		this.addPolygonLine(
			root,
			[
				[-94, 44],
				[-28, 76],
				[72, 62],
				[98, 18],
				[84, -86],
				[-20, -112],
				[-98, -60],
				[-112, 10]
			],
			3,
			moatMat
		);
		this.addPolygonLine(
			root,
			[
				[-26, -6],
				[6, 18],
				[34, 2],
				[42, -30],
				[6, -46],
				[-30, -34]
			],
			22,
			trenchMat
		);

		const markerGeo = new THREE.SphereGeometry(2.4, 12, 12);
		const markerMat = new THREE.MeshBasicMaterial({ color: 0xfff454 });
		for (const [x, y] of [
			[-104, -22],
			[-66, -31],
			[-22, -17],
			[12, 20],
			[46, -26],
			[86, -12],
			[118, -4],
			[28, 50]
		]) {
			const marker = new THREE.Mesh(markerGeo, markerMat);
			marker.position.set(x, y, 5);
			root.add(marker);
		}

		return root;
	}

	private addBox(
		root: THREE.Group,
		x: number,
		y: number,
		width: number,
		depth: number,
		height: number,
		material: THREE.Material,
		rotation = 0
	) {
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), material);
		mesh.position.set(x, y, height / 2);
		mesh.rotation.z = rotation;
		root.add(mesh);
	}

	private addBoxAt(
		root: THREE.Group,
		x: number,
		y: number,
		width: number,
		depth: number,
		height: number,
		zBase: number,
		material: THREE.Material,
		rotation = 0
	) {
		const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, depth, height), material);
		mesh.position.set(x, y, zBase + height / 2);
		mesh.rotation.z = rotation;
		root.add(mesh);
	}

	private addGabledBuilding(
		root: THREE.Group,
		x: number,
		y: number,
		width: number,
		depth: number,
		wallHeight: number,
		roofHeight: number,
		wallMat: THREE.Material,
		roofMat: THREE.Material
	) {
		this.addBox(root, x, y, width, depth, wallHeight, wallMat);

		const hw = width / 2;
		const hd = depth / 2;
		const z = wallHeight;
		const vertices = new Float32Array([
			-hw,
			-hd,
			z,
			hw,
			-hd,
			z,
			0,
			-hd,
			z + roofHeight,
			-hw,
			hd,
			z,
			hw,
			hd,
			z,
			0,
			hd,
			z + roofHeight
		]);
		const indices = [0, 1, 2, 3, 5, 4, 0, 3, 4, 0, 4, 1, 1, 4, 5, 1, 5, 2, 2, 5, 3, 2, 3, 0];
		const geo = new THREE.BufferGeometry();
		geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
		geo.setIndex(indices);
		geo.computeVertexNormals();
		const roof = new THREE.Mesh(geo, roofMat);
		roof.position.set(x, y, 0);
		root.add(roof);
	}

	private addCrenellations(
		root: THREE.Group,
		x: number,
		y: number,
		width: number,
		depth: number,
		zBase: number,
		material: THREE.Material,
		count: number
	) {
		for (let i = 0; i < count; i++) {
			const fx = x - width / 2 + 4 + (i * (width - 8)) / Math.max(1, count - 1);
			this.addBoxAt(root, fx, y - depth / 2 - 1.5, 4, 3, 5, zBase, material);
			this.addBoxAt(root, fx, y + depth / 2 + 1.5, 4, 3, 5, zBase, material);
		}
		const sideCount = Math.max(2, Math.round(count * (depth / width)));
		for (let i = 0; i < sideCount; i++) {
			const fy = y - depth / 2 + 4 + (i * (depth - 8)) / Math.max(1, sideCount - 1);
			this.addBoxAt(root, x - width / 2 - 1.5, fy, 3, 4, 5, zBase, material);
			this.addBoxAt(root, x + width / 2 + 1.5, fy, 3, 4, 5, zBase, material);
		}
	}

	private addLine(
		root: THREE.Group,
		from: [number, number, number],
		to: [number, number, number],
		material: THREE.LineBasicMaterial
	) {
		const geo = new THREE.BufferGeometry().setFromPoints([
			new THREE.Vector3(...from),
			new THREE.Vector3(...to)
		]);
		root.add(new THREE.Line(geo, material));
	}

	private addRectLine(
		root: THREE.Group,
		x: number,
		y: number,
		width: number,
		depth: number,
		z: number,
		material: THREE.LineBasicMaterial
	) {
		const hw = width / 2;
		const hd = depth / 2;
		this.addPolygonLine(
			root,
			[
				[x - hw, y - hd],
				[x + hw, y - hd],
				[x + hw, y + hd],
				[x - hw, y + hd]
			],
			z,
			material
		);
	}

	private addPolygonLine(
		root: THREE.Group,
		points: Array<[number, number]>,
		z: number,
		material: THREE.LineBasicMaterial
	) {
		const closed = [...points, points[0]];
		const geo = new THREE.BufferGeometry().setFromPoints(
			closed.map(([x, y]) => new THREE.Vector3(x, y, z))
		);
		root.add(new THREE.Line(geo, material));
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
		if (this.findingMesh) this.findingMesh.visible = this.showFinding;
		if (this.siteModel) this.siteModel.visible = this.showSiteModel;

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
			this.drone.position.y += Math.sin(performance.now() * 0.005) * 1.5;
		}

		if (this.showPath) {
			const total = this.path.points.length;
			const drawn = Math.max(2, Math.floor(this.progress * total));
			const fullPos = (this.pathLine.geometry.attributes.position as THREE.BufferAttribute)
				.array as Float32Array;
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
			posArr[i * 3 + 1] =
				-(m.y - this.modelOrigin.y) / this.modelScale + (Math.random() - 0.5) * 30;
			posArr[i * 3 + 2] = (m.z - this.modelOrigin.z) / this.modelScale;
			const pm = Math.random();
			colArr[i * 3 + 0] = pm < 0.5 ? pm * 2 : 1;
			colArr[i * 3 + 1] = pm < 0.5 ? 1 : 1 - (pm - 0.5) * 2;
			colArr[i * 3 + 2] = 0.2;
			age[i] = 0;
		}

		for (let i = 0; i < age.length; i++) {
			if (age[i] >= maxAge[i]) continue;
			age[i] += dt;
			posArr[i * 3 + 0] += Math.sin(performance.now() * 0.001 + i) * 0.05;
			posArr[i * 3 + 1] += Math.cos(performance.now() * 0.001 + i) * 0.05;
			posArr[i * 3 + 2] += 0.3;
			if (age[i] >= maxAge[i]) {
				posArr[i * 3 + 0] = posArr[i * 3 + 1] = posArr[i * 3 + 2] = -1e6;
			}
		}

		positions.needsUpdate = true;
		colors.needsUpdate = true;
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
