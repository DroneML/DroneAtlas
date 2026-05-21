<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import * as THREE from 'three';

	export let visible: boolean = true;
	export let zIndex: number = 20;
	// Scene 'mode' controls subtle cinematic variations per slide.
	// 'idle' — gentle hover; 'flight' — assertive hover; 'transit' — sweeping map-navigation flyby.
	export let mode: 'idle' | 'flight' | 'transit' = 'idle';

	let canvas: HTMLCanvasElement;
	let raf: number | null = null;
	let renderer: THREE.WebGLRenderer | null = null;
	let scene: THREE.Scene | null = null;
	let camera: THREE.PerspectiveCamera | null = null;
	let drone: THREE.Group | null = null;
	let rotors: THREE.Group[] = [];
	let startTime = 0;
	let flightStart = 0;
	let lastVisible = visible;
	let lastMode = mode;

	$: if (visible && (!lastVisible || lastMode !== mode)) {
		flightStart = performance.now();
	}
	$: lastVisible = visible;
	$: lastMode = mode;

	function buildDrone(): { group: THREE.Group; rotors: THREE.Group[] } {
		const g = new THREE.Group();
		const rot: THREE.Group[] = [];

		// Central body shell — sleek rounded box with matte finish.
		const bodyMat = new THREE.MeshStandardMaterial({
			color: 0x1a1f28,
			metalness: 0.55,
			roughness: 0.35
		});
		const body = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.28, 0.9), bodyMat);
		body.castShadow = true;
		g.add(body);

		// Top canopy — slightly smaller, raised.
		const canopy = new THREE.Mesh(
			new THREE.BoxGeometry(0.9, 0.18, 0.6),
			new THREE.MeshStandardMaterial({
				color: 0x2a323d,
				metalness: 0.7,
				roughness: 0.25
			})
		);
		canopy.position.y = 0.2;
		g.add(canopy);

		// Cyan accent strip running along the top.
		const stripe = new THREE.Mesh(
			new THREE.BoxGeometry(0.88, 0.02, 0.08),
			new THREE.MeshStandardMaterial({
				color: 0x39d2ff,
				emissive: 0x0a7aa0,
				emissiveIntensity: 1.2,
				metalness: 0.2,
				roughness: 0.3
			})
		);
		stripe.position.y = 0.3;
		g.add(stripe);

		// Four diagonal arms.
		const armMat = new THREE.MeshStandardMaterial({
			color: 0x262c35,
			metalness: 0.6,
			roughness: 0.4
		});
		const armPositions: [number, number][] = [
			[0.7, 0.55],
			[-0.7, 0.55],
			[0.7, -0.55],
			[-0.7, -0.55]
		];
		for (const [x, z] of armPositions) {
			const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.95, 16), armMat);
			arm.rotation.z = Math.PI / 2;
			arm.rotation.y = Math.atan2(z, x);
			arm.position.set(x * 0.5, 0, z * 0.5);
			const len = Math.sqrt(x * x + z * z);
			arm.scale.x = len / 0.95;
			g.add(arm);
		}

		// Motors + spinning rotor groups at each corner.
		const motorMat = new THREE.MeshStandardMaterial({
			color: 0x3a4250,
			metalness: 0.75,
			roughness: 0.25
		});
		const bladeMat = new THREE.MeshStandardMaterial({
			color: 0xcfd5dd,
			metalness: 0.1,
			roughness: 0.6,
			transparent: true,
			opacity: 0.38,
			side: THREE.DoubleSide
		});
		const glowMat = new THREE.MeshBasicMaterial({
			color: 0x39d2ff,
			transparent: true,
			opacity: 0.45
		});

		for (const [x, z] of armPositions) {
			const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 0.14, 20), motorMat);
			motor.position.set(x, 0.1, z);
			g.add(motor);

			// Glowing ring beneath each motor — gives the rotor disc its signature look.
			const ring = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.34, 32), glowMat);
			ring.rotation.x = -Math.PI / 2;
			ring.position.set(x, 0.18, z);
			g.add(ring);

			// Spinning rotor group — two thin blades.
			const rotorGroup = new THREE.Group();
			rotorGroup.position.set(x, 0.23, z);
			const bladeGeo = new THREE.BoxGeometry(0.62, 0.01, 0.05);
			const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
			const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
			blade2.rotation.y = Math.PI / 2;
			rotorGroup.add(blade1, blade2);
			g.add(rotorGroup);
			rot.push(rotorGroup);
		}

		// Landing skids.
		const skidMat = new THREE.MeshStandardMaterial({
			color: 0x1a1f28,
			metalness: 0.5,
			roughness: 0.5
		});
		for (const sx of [-0.45, 0.45]) {
			const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.05, 10), skidMat);
			skid.rotation.x = Math.PI / 2;
			skid.position.set(sx, -0.24, 0);
			g.add(skid);
			for (const sz of [-0.45, 0.45]) {
				const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.15, 8), skidMat);
				leg.position.set(sx, -0.17, sz);
				g.add(leg);
			}
		}

		// Gimbal + camera pod under the nose.
		const gimbal = new THREE.Mesh(
			new THREE.SphereGeometry(0.14, 16, 16),
			new THREE.MeshStandardMaterial({
				color: 0x0f1419,
				metalness: 0.7,
				roughness: 0.3
			})
		);
		gimbal.position.set(0.35, -0.18, 0);
		g.add(gimbal);
		const lens = new THREE.Mesh(
			new THREE.CylinderGeometry(0.08, 0.1, 0.06, 20),
			new THREE.MeshStandardMaterial({
				color: 0x39d2ff,
				emissive: 0x0a6a8a,
				emissiveIntensity: 0.8,
				metalness: 0.9,
				roughness: 0.15
			})
		);
		lens.rotation.z = Math.PI / 2;
		lens.position.set(0.44, -0.18, 0);
		g.add(lens);

		// Tail nav light — red blinker.
		const tailLight = new THREE.Mesh(
			new THREE.SphereGeometry(0.035, 8, 8),
			new THREE.MeshBasicMaterial({ color: 0xff4a4a })
		);
		tailLight.position.set(-0.65, 0.05, 0);
		tailLight.name = 'tailLight';
		g.add(tailLight);

		return { group: g, rotors: rot };
	}

	function resize() {
		if (!renderer || !camera || !canvas) return;
		const w = canvas.clientWidth;
		const h = canvas.clientHeight;
		if (w === 0 || h === 0) return;
		renderer.setSize(w, h, false);
		camera.aspect = w / h;
		camera.updateProjectionMatrix();
	}

	function tick(ts: number) {
		raf = requestAnimationFrame(tick);
		if (!renderer || !scene || !camera || !drone) return;
		if (!startTime) startTime = ts;
		const t = (ts - startTime) / 1000;

		// Spin the rotors fast.
		for (const r of rotors) r.rotation.y += 1.2;

		if (mode === 'transit') {
			const elapsed = (ts - (flightStart || ts)) / 1000;
			const cycle = Math.min(1, elapsed / 2.2);
			const k = 1 - Math.pow(1 - cycle, 3);
			const arc = Math.sin(k * Math.PI);
			drone.position.set(0.15 - k * 0.45, -0.5 + arc * 0.42, -0.1 - arc * 0.35);
			drone.scale.setScalar(0.86 + arc * 0.42);
			drone.rotation.set(
				-0.14 + arc * 0.1,
				0.08 + k * 0.22,
				0.08 - k * 0.16 + Math.sin(t * 2.2) * 0.04
			);
		} else {
			// Gentle hover + drift.
			const bob = Math.sin(t * 1.8) * 0.06;
			const sway = Math.sin(t * 0.45) * 0.15;
			const rise = Math.cos(t * 0.25) * 0.1;
			drone.position.set(sway, -0.5 + bob + rise, 0);
			drone.scale.setScalar(1);

			// Slight yaw + pitch oscillation.
			const flightLean = mode === 'flight' ? -0.18 : -0.08;
			drone.rotation.set(
				flightLean + Math.sin(t * 1.1) * 0.03,
				Math.sin(t * 0.3) * 0.12 + 0.1, // slight facing 3/4 view
				Math.sin(t * 0.9) * 0.04
			);
		}

		// Blinking tail light.
		const tail = drone.getObjectByName('tailLight') as THREE.Mesh | undefined;
		if (tail) {
			const mat = tail.material as THREE.MeshBasicMaterial;
			mat.opacity = 0.3 + (Math.sin(t * 3) * 0.5 + 0.5) * 0.7;
			mat.transparent = true;
		}

		renderer.render(scene, camera);
	}

	onMount(() => {
		scene = new THREE.Scene();
		// Transparent background so the map shows through.
		scene.background = null;

		camera = new THREE.PerspectiveCamera(
			42,
			canvas.clientWidth / Math.max(1, canvas.clientHeight),
			0.1,
			50
		);
		camera.position.set(0, 0.6, 4);
		camera.lookAt(0, -0.2, 0);

		renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
		renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
		renderer.setClearColor(0x000000, 0);

		// Lighting: warm key + cool fill + subtle rim for cinematic feel.
		scene.add(new THREE.AmbientLight(0xffffff, 0.35));
		const key = new THREE.DirectionalLight(0xfff1d8, 1.25);
		key.position.set(3, 4, 2);
		scene.add(key);
		const fill = new THREE.DirectionalLight(0x88ccff, 0.55);
		fill.position.set(-3, 1, 2);
		scene.add(fill);
		const rim = new THREE.DirectionalLight(0x39d2ff, 0.85);
		rim.position.set(-1.5, 1.5, -3);
		scene.add(rim);

		const built = buildDrone();
		drone = built.group;
		rotors = built.rotors;
		scene.add(drone);

		resize();
		window.addEventListener('resize', resize);
		raf = requestAnimationFrame(tick);
	});

	onDestroy(() => {
		if (raf !== null) cancelAnimationFrame(raf);
		window.removeEventListener('resize', resize);
		renderer?.dispose();
	});
</script>

<canvas
	bind:this={canvas}
	class="hero-drone pointer-events-none absolute inset-0"
	style="opacity: {visible ? 1 : 0}; z-index: {zIndex}"
></canvas>

<style>
	.hero-drone {
		transition: opacity 0.28s ease-out;
		width: 100%;
		height: 100%;
	}
</style>
