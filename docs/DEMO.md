# DroneAtlas — Presentation Deck

A pausable, slide-based presentation that showcases DroneAtlas as a multi-sensor
drone data exploration platform. Lives at `/demo` in the web app and is
designed for live presenting — each slide plays its intro animation and
**pauses at the end** until the presenter advances.

---

## Goals

### Primary
- **Tell a story about this platform.** Multi-sensor drone data → ML inference
  → explorable maps, anchored in a real site (Veldhoven archaeology).
- **Be presenter-friendly.** Pause at every slide, presenter notes on demand,
  visible slide indicator, keyboard and click-to-advance.
- **Be reliably spectacular.** Deterministic animations, preloaded data,
  graceful fallbacks — no live-demo failures.

### Secondary
- **Demonstrate technical depth without lecturing.** 3D drone, animated flight
  path, real ML-prediction raster rendered as a 3D heightfield, screen-pinned
  sensor stack previews — all signal "this is a serious platform" without
  bullet lists.
- **Seed follow-up conversations.** After the demo, people should ask: "How
  does the ML layer work?" "Can I add my own site?" "What sensors do you
  support?"

---

## Narrative arc (9 slides)

Each slide pauses at the end. `Duration` is the intro animation length, not a
runtime cap.

| # | Slide | Duration | Visual |
|---|-------|----------|--------|
| 1 | **Title** | 8 s | Centre card: *"DroneAtlas — seeing what the ground hides."* Slow cinematic zoom. |
| 2 | **The Problem** | 20 s | Centre card: *"Terabytes of sensor data. An explorable insight is the hard part."* |
| 3 | **The Site** | 25 s | Pin drop from globe to Veldhoven farmland. |
| 4 | **The Flight** | 35 s | 3D drone runs the lawn-mower path over the survey box; live telemetry. |
| 5 | **The Stack** | 40 s | Four stylised sensor layers fade in over the survey box (RGB · Thermal · LiDAR · ML). |
| 6 | **Human vs. Machine** | 35 s | Split-reveal: RGB on the left, ML confidence heatmap wipes in from the right; detection cards slide in. |
| 7 | **The Finding** | 40 s | Camera orbits 360° around the real `ml_prediction.tif` rendered as a 3D plasma heightfield; drone hovers above. |
| 8 | **One Platform** | 25 s | Fly-hops Veldhoven → Ostia Antica → Veluwe. |
| 9 | **Close** | 12 s | End card with stats and tagline. |

All slide copy lives in `web/src/lib/demo/beats.ts`. Each slide has a
`presenterNote` string shown only to the presenter (via `N`).

---

## Showcase features

### On-screen
- **3D drone** — low-poly X-frame body with glowing rotors and sensor pod.
- **Animated flight path** — dimmed full-path trace + bright drawn-so-far
  segment in DroneAtlas cyan.
- **Screen-pinned sensor stack** (slide 5) — stylised but visually credible
  RGB / thermal / LiDAR / ML previews drawn over the Veldhoven survey bounds.
- **Split-reveal** (slide 6) — same box, RGB on the left, ML heatmap on the
  right with glowing anomaly blobs.
- **3D ML-prediction heightfield** (slide 7) — the real `ml_prediction.tif`
  downsampled and extruded (`z = confidence × 40m`) with a plasma vertex-colour
  ramp. Camera does a full 360° orbit around it with the drone hovering above.
  If the raster fails to load, a procedural fallback mesh keeps the slide from
  looking broken.
- **HUD** — brand, slide title, subtitle, caption, telemetry block (toggled
  per slide via `showTelemetry`).
- **Slide nav** — bottom-centre pill: prev / counter / dots / title / next.
  Dots are clickable to jump to any slide.
- **Presenter notes** — toggleable yellow panel (bottom-left) showing the
  current slide's `presenterNote`.
- **Slide-end hint** — small animated chip in the bottom-right when a slide
  has finished its intro animation and is waiting for the presenter to
  advance.

### Under the hood
- **SvelteKit route** `/demo`, SSR disabled, full-screen MapLibre with
  interaction locked.
- **Timeline driver** (`$lib/demo/timeline.ts`) — beats defined as
  `{ start, duration, enter, tick, exit }`. Each `frame()` clamps progress
  at the end of the current slide and **pauses**, setting `atSlideEnd = true`.
  `nextSlide()` seeks to the next beat's start and auto-plays its intro.
- **Three.js custom MapLibre layer** (`$lib/demo/DroneLayer.ts`) — shares the
  map's WebGL context, uses `MercatorCoordinate` for world-space placement of
  drone, path, particles, and the heightfield mesh.
- **ML heightfield loader** (`$lib/demo/mlHeightfield.ts`) — calls the shared
  `geoTiffProcessor.loadGeoTIFF` utility, downsamples to a 128×128 grid, and
  returns values + WGS84 bounds. `syntheticHeightfield()` produces a procedural
  fallback with three gaussian "foundation" peaks.
- **Synthetic flight path** (`$lib/demo/path.ts`) — parameterised lawn-mower
  pattern centred on Veldhoven (default 4 passes × 0.3 km).
- **Reactive overlays** — plain Svelte components driven by `currentBeat.id`
  and a handful of UI flags; no shared stores with the main app, no risk of
  regression.

---

## Controls

| Key | Action |
|-----|--------|
| `→` / `PageDown` | Next slide (plays its intro animation). Starts the deck on the first press if not yet playing. |
| `SPACE` | Mid-slide: pause / resume the intro animation. At slide end: advance to next. |
| `←` / `PageUp` | Previous slide. If you're more than 0.5 s into the current slide, restart it instead. |
| `Home` / `R` | Reset everything and jump back to slide 1. |
| `N` | Toggle presenter notes panel. |
| Click anywhere (outside buttons) | Advance to next slide when current slide has ended. |

---

## Design tokens

- **Accent cyan** `#39d2ff` — brand, path glow, primary UI accents.
- **Alert red** `#ff6b6b` — thermal, warning detections.
- **Signal green** `#06ffa5` — LiDAR, vegetation.
- **ML orange** `#ffb84d` — ML layer chip, foundation detection card.
- **Presenter notes yellow** `#ffc938` / `#ffe8a3` — presenter-only panel.
- **Background** near-black `#050810` to let glows read.
- Typography: Inter (system fallback), uppercase kickers with 0.2–0.4em
  letter-spacing for telemetry feel.

---

## Non-goals

- **Not a real-time pipeline.** The flight path, particles (not used now),
  detection confidences, and sensor chips are illustrative.
- **Not interactive beyond slide nav.** The map itself is locked during
  playback; the full product lives at `/`.
- **Not a substitute for a product tour.** The deck is the 5-ish-minute hook;
  the real demo happens in the app after the Q&A.

---

## Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Live-demo glitch mid-show | Every slide is pause-at-end; `R` / `Home` reset; `← →` skip. |
| `ml_prediction.tif` fails to load | `loadMlHeightfield` falls back to `syntheticHeightfield()` and the slide continues. |
| Slow machine / dropped frames | Heightfield downsampled to 128×128 before upload; COGs not loaded onto the map during the deck. |
| Copy feels cheesy | All slide copy + presenter notes live in `beats.ts` — iterate with stakeholders. |

---

## Extending the deck

- **Change the site.** `generateFlightPath({ center, passLengthKm, passes })`
  takes a custom anchor; the heightfield loader accepts any raster URL via the
  `projectLocations` store.
- **Add/remove a slide.** Push a new `Beat` into `buildBeats()` with
  `start: at(duration).start` (the `at()` helper handles offsets). Add a dot
  for it automatically via `SlideNav`.
- **Add a soundtrack.** A quiet synth bed + UI ticks on slide transitions
  would add to the feel — keep optional since some venues are muted.
- **Record a fallback video.** Screen-capture a full run once tuned so the
  presenter always has a zero-risk backup.
