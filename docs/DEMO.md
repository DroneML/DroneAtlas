# DroneAtlas — Cinematic Demo

A 5-minute scripted presentation that showcases DroneAtlas as a multi-sensor
drone data exploration platform. Lives at `/demo` in the web app.

---

## Goals

### Primary
- **Wow in 5 minutes.** The audience should leave remembering a visual, not a
  feature list. Every beat earns its seconds.
- **Tell a story, not a tour.** A single drone flight that starts with a
  question and ends with more answers than were asked for.
- **Make the platform feel inevitable.** Multi-sensor capture + ML inference +
  atmospheric side-effects should read as one coherent system, not four
  bolted-together features.

### Secondary
- **Demonstrate technical depth without lecturing.** 3D drone, animated flight
  path, layered rasters, GPU particles — all signal "this is a serious
  platform" without a single bullet point on screen.
- **Be reliably spectacular.** A scripted timeline means no live-demo
  failures. Every beat is deterministic, skippable, and restartable.
- **Seed follow-up conversations.** After the demo, people should ask: "Can I
  see the detection step?" "What sensors does it support?" "How does the
  particulate mapping work?"

---

## Narrative arc

A single drone flight as the spine of the story. Six beats, each with a
specific emotional job.

| # | Beat | Time | Job |
|---|------|------|-----|
| 1 | Cold open | 0:00–0:30 | Pose the question. Set the stakes. |
| 2 | Drone arrival | 0:30–1:15 | Make the invisible tangible — the flight begins. |
| 3 | Sensor reveal | 1:15–2:30 | "The map becomes a stack." Signature visual. |
| 4 | ML inference | 2:30–3:30 | Machines see what we don't. |
| 5 | Atmospheric capture | 3:30–4:15 | Side-effect becomes discovery. |
| 6 | Finale | 4:15–5:00 | One flight. Many discoveries. |

### 1 · Cold open (0:00–0:30)
- Hook: *"What if a single flight could map the unseen?"*
- Black frame with kicker line, then hero question fades in.
- Map slowly zooms from continent scale toward the target region while the
  pitch and bearing ease in. No data yet — just promise.

### 2 · Drone arrival (0:30–1:15)
- HUD fades in (telemetry, scrubber, beat title).
- 3D drone becomes visible; glowing flight path begins to draw as it flies.
- Camera tracks the drone with a 60° pitch and a slow bearing sweep. Altitude,
  speed, area-covered counters tick up in real time.

### 3 · Sensor reveal (1:15–2:30)
- The **signature shot**. Sensor chips pop in from the right one at a time:
  RGB → Thermal → Multispectral → LiDAR.
- Each activation corresponds to a sweep-reveal of that sensor's raster layer
  over the mapped area (radial mask originating from the drone).
- Camera continues to orbit; the layered "stack" becomes visible.

### 4 · ML inference (2:30–3:30)
- Detection cards slide in from the left with confidence bars:
  vegetation stress → built structure → thermal anomaly.
- Low-poly 3D markers pop up over corresponding regions with pulsing
  highlights. Connector lines link each marker to its card.
- Detection counter on the HUD surges.

### 5 · Atmospheric capture (3:30–4:15)
- GPU air-particle system activates: ~4,000 particles drift from the drawn
  flight path, color-coded green→yellow→red by simulated PM2.5.
- Camera pulls up slightly, revealing the particles as a volumetric layer
  above the ground.
- Caption: *"A side-effect becomes a discovery."*

### 6 · Finale (4:15–5:00)
- Camera pulls back to a top-down view; pitch and bearing ease to zero.
- All layers, detections, and particles visible at once.
- End card overlays with the mission stats: 12.4 km² mapped, 847 detections,
  4 sensors, 18:42 flight time.
- Closing line: *"One flight. Many discoveries."*

---

## Showcase features

### On-screen during the demo
- **3D drone** — low-poly but believable; X-frame body, four glowing rotors,
  sensor pod underneath. Bobs subtly, rotates to follow heading.
- **Animated flight path** — dimmed full-path trace + bright drawn-so-far
  segment in DroneAtlas cyan. Reveals progressively as the drone flies.
- **HUD telemetry** — altitude, speed, area covered (km²), detections count,
  beat title, captions, scrubber with elapsed/total time.
- **Sensor chips** — one per modality, glow-border in the sensor's accent
  color, appear with a staggered fly-in.
- **Detection cards** — class label, color dot, confidence bar, connector to
  the in-scene marker.
- **Air particles** — GPU points, additive blending, color ramp by simulated
  PM2.5. Age out over 4–8 seconds so the scene never saturates.
- **End card** — stats grid with gradient numerals, final tagline, subtle
  credits line.

### Under the hood
- **SvelteKit route** `/demo`, SSR disabled, full-screen MapLibre with
  interaction locked during the cinematic.
- **Timeline driver** (`$lib/demo/timeline.ts`) — beats defined as
  `{ start, duration, enter, tick, exit }`, a single `requestAnimationFrame`
  loop, play/pause/seek/next/prev.
- **Three.js custom MapLibre layer** (`$lib/demo/DroneLayer.ts`) — shares the
  map's WebGL context, uses `MercatorCoordinate` for world-space placement of
  drone, path, and particles.
- **Synthetic flight path** (`$lib/demo/path.ts`) — lawn-mower survey pattern
  over a region near Amsterdam with gentle altitude variation, sampled with
  interpolation + bearing for camera follow.
- **Reactive overlays** — plain Svelte components driven by beat callbacks;
  no stores shared with the main app, no risk of regression.

---

## Controls

- `SPACE` — play / pause
- `→` — skip to next beat
- `←` — restart current beat, or jump to previous beat if near its start
- `R` — reset the whole demo

---

## Design tokens

- **Accent cyan** `#39d2ff` — brand, path glow, primary highlights
- **Alert red** `#ff6b6b` — thermal, anomalies
- **Violet** `#7c3aff`, `#9d4edd` — multispectral, scrubber gradient
- **Signal green** `#06ffa5` — LiDAR, vegetation
- **Background** near-black `#050810` to let glows read
- Typography: Inter (system fallback), uppercase kickers with 0.2–0.4em
  letter-spacing for sci-fi telemetry feel

---

## Non-goals

- **Not a real ML pipeline.** Detections, confidences, sensor names, and
  particulate readings are illustrative. The demo sells the *experience*, not
  the numbers.
- **Not interactive.** The map is non-interactive during playback by design —
  a cinematic, not a sandbox. The real app at `/` is where users explore.
- **Not a substitute for the full product tour.** This is the 5-minute hook;
  the follow-up conversation is where the real platform gets demoed.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Live-demo glitch mid-show | Deterministic timeline + `R` restart + `←/→` beat skip |
| Slow machine / dropped frames | GPU particles capped at 4k; all raster assets preload before play |
| Copy feels cheesy | Copy is in `$lib/demo/beats.ts` — iterate with stakeholders |
| Looks like vaporware | Tie every visual beat back to a real platform capability in the follow-up Q&A |

---

## Extending the demo

- **Swap in real paths.** `generateFlightPath()` can be replaced with a loader
  that reads a GeoJSON of an actual mission.
- **Swap in real rasters.** The sensor beat currently shows chips only;
  wiring actual COG layers in with a sweep-reveal mask is the next polish
  pass.
- **Add a soundtrack.** A quiet synth bed + UI ticks on beat transitions
  would add ~20% to the "wow" factor. Keep optional — some venues mute.
- **Record a fallback video.** Screen-capture the full 5 minutes once tuned,
  so the presenter has a zero-risk backup at high-stakes events.
