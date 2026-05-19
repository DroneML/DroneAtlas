# DroneAtlas Presentation Deck

The `/demo` route is a keynote-style presentation for the DroneML / DroneATLAS story. It explains the archaeological problem, the collaboration, the machine-learning pipeline, the DroneATLAS platform workflow, and ends with a cinematic map demo.

The deck is presenter-friendly: every slide plays an intro animation and pauses at the end until the presenter advances.

## Story

The deck is anchored in the Weesp case study from 4D Research Lab:

> A medieval castle disappeared from the landscape. The traces are still there, but only as faint signals across drone sensor layers. DroneML helps archaeologists find those signals. DroneATLAS makes that workflow accessible as a research platform.

## Slide Arc

| # | Slide | Duration | Purpose |
|---|-------|----------|---------|
| 1 | In Search Of A Castle | 8 s | Cold open with the Weesp castle story. |
| 2 | The Collaboration | 7 s | Show the partner ecosystem and roles. |
| 3 | The Weesp Use Case | 8 s | Ground the project in real fieldwork and data. |
| 4 | Many Sensors, One Hidden Site | 9 s | Show optical, thermal, multispectral, and LiDAR evidence. |
| 5 | The Interpretation Bottleneck | 8 s | Explain why expert manual interpretation is hard to scale. |
| 6 | DroneML: The Core | 8 s | Present DroneML as the scientific ML engine. |
| 7 | How The Machine Learning Works | 9 s | Explain labels, UNet features, RandomForest, probability map. |
| 8 | CoeusAI And Pycoeus | 8 s | Show usable QGIS interface and reusable Python core. |
| 9 | DroneATLAS: The Research Platform | 8 s | Present DroneATLAS as the polished platform experience. |
| 10 | Drag, Drop, Process | 9 s | Connect upload, layer organization, processing, and ML output. |
| 11 | Explore The Site | 14 s | Cinematic map movement, drone flight, sensor layers. |
| 12 | From Prediction To Archaeological Insight | 14 s | 3D ML probability surface as expert interpretation focus. |

## Design Principles

- Start with a concrete story, not software architecture.
- Keep the first ten slides keynote-like and readable.
- Use the cinematic map only as the payoff after the audience understands the pipeline.
- Present DroneATLAS as a platform, not as a prototype.
- Make DroneML the core engine and DroneATLAS the researcher-facing environment.
- Emphasize that ML supports archaeological interpretation; it does not replace it.

## Visual Sources

The deck references public imagery and facts from:

- eScience Center article: "Anomalies in the Soil: Enhancing Archaeological Discoveries with Machine Learning using CoeusAI".
- Waagen, J. (2023). 4DRL Report Series 4 - In search of a castle: Multisensor UAS research at the Medieval site of 't Huijs ten Bosch, Weesp. DOI: 10.21942/uva.23375486.v3. CC BY 4.0.
- DroneML, CoeusAI, and Pycoeus pages in the Research Software Directory.

## Image Slots

Optional local images can be dropped into `web/static/demo/weesp/`. Missing images render as styled placeholders, and several slots fall back to public eScience article images until replaced.

| File | Used On | Suggested Source |
|------|---------|------------------|
| `01-historical-castle.jpg` | Slide 1 | Historical drawing / report figure 2 or castle reconstruction. |
| `02-weesp-field.jpg` | Slides 1 and 3 | Present-day Weesp field photo. |
| `03-drone-fieldwork.jpg` | Slide 3 | Drone equipment / fieldwork photo. |
| `04-satellite-ahn.jpg` | Reserved | Satellite/AHN context image from report figure 6 or 7. |
| `05-optical-annotated.jpg` | Slide 4 | September optical annotated image, report figs. 18-20. |
| `06-thermal-annotated.jpg` | Slide 4 | Thermal annotated image, report figs. 21-22 or article thermal image. |
| `07-lidar-dtm-annotated.jpg` | Slide 4 | LiDAR DTM annotated image, report figs. 16-17. |
| `08-ndvi-annotated.jpg` | Slide 4 | NDVI annotated image, report figs. 23-24. |
| `09-all-anomalies.jpg` | Slide 5 | All identified anomalies, report figure 25. |
| `10-coeus-probability.png` | Slides 7 and 8 | CoeusAI probability output from the eScience article. |
| `11-coeus-qgis.jpg` | Slide 8 | CoeusAI interface inside QGIS. |
| `12-droneatlas-platform.jpg` | Slide 9 | Polished DroneATLAS platform screenshot. |
| `13-drag-drop-process.jpg` | Slide 10 | Drag/drop or processing workflow screenshot. |

## Implementation Notes

- `web/src/lib/demo/beats.ts` defines the 12-slide timeline, map movement, presenter notes, telemetry, and overlay triggers.
- `web/src/lib/demo/components/ScientificNarrativeOverlay.svelte` defines the keynote visuals, partner cards, pipeline diagrams, platform mockup, and final cinematic captions.
- `web/src/routes/demo/+page.svelte` anchors the synthetic survey path and final 3D probability surface near Weesp.
- `web/src/lib/demo/mlHeightfield.ts` creates a deterministic castle-like probability surface for the final 3D result.
- `web/src/lib/demo/DroneLayer.ts` renders the drone, flight path, particles, and final heightfield in the MapLibre WebGL context.

## Controls

| Key | Action |
|-----|--------|
| Right arrow / PageDown | Next slide. Starts the deck if not yet started. |
| Space | Pause/resume. At slide end, advance to the next slide. |
| Left arrow / PageUp | Previous slide or restart current slide. |
| R / Home | Reset to slide 1. |
| N | Toggle presenter notes. |
| Click | Advance when the current slide has ended. |

## Presenter Notes

The full script and memorization version live in:

`docs/DEMO_PRESENTATION_SCRIPT.md`

## Reliability

- The map uses a fixed Weesp-centred synthetic flight path.
- The final ML surface is deterministic and generated locally, so the finale is not blocked by a GeoTIFF download or parser failure.
- External article images enrich the keynote slides. If they fail to load, the deck still carries the story through text, diagrams, map, and 3D visuals.
