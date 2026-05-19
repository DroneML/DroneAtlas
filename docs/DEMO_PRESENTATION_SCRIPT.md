# DroneATLAS Demo Presentation Script

## Purpose

This is the presenter script for the DroneML / DroneATLAS demo. The presentation is designed as a keynote-style story with a cinematic product demo at the end. It should be clear on the problem, the collaboration, the machine-learning pipeline, the platform solution, and the final visual result.

The central message is:

> DroneML makes hidden archaeological signals detectable. DroneATLAS makes the workflow accessible, visual, and reusable as a research platform.

## Presenter Framing

Do not describe DroneATLAS as a prototype, mockup, future concept, or experiment.

Use these words instead:

- platform
- research environment
- workflow
- analysis pipeline
- interactive exploration
- ML-supported interpretation
- reusable scientific infrastructure

The story starts with a real archaeological use case: the medieval castle site of 't Huijs ten Bosch near Weesp, investigated by 4D Research Lab with optical, thermal, multispectral, and LiDAR drone sensing.

## Slide Structure

| # | Slide | Core message | Visual direction |
|---|-------|--------------|------------------|
| 1 | In Search Of A Castle | A disappeared medieval castle leaves faint traces across drone sensor layers. | Historical castle reference, present-day field, faint glowing outline. |
| 2 | The Collaboration | The project connects archaeology, RSE, ML, and community validation. | Partner cards and roles. |
| 3 | The Weesp Use Case | The story is grounded in real fieldwork at 't Huijs ten Bosch. | Field photos, drone photos, key facts. |
| 4 | Many Sensors, One Hidden Site | Each sensor captures a different physical clue. | Optical, thermal, multispectral/NDVI, LiDAR stack. |
| 5 | The Interpretation Bottleneck | Expert interpretation across many layers is slow and hard to scale. | 55 anomalies, annotation ledger, detection cards. |
| 6 | DroneML: The Core | DroneML is the scientific machine-learning engine. | Multi-sensor GeoTIFFs to DroneML to candidate signals. |
| 7 | How The Machine Learning Works | Expert labels train a fast model that returns probability per pixel. | Labels to UNet features to RandomForest to probability map. |
| 8 | CoeusAI And Pycoeus | DroneML produced usable and reusable open software. | QGIS interface, CoeusAI output, Python core. |
| 9 | DroneATLAS: The Research Platform | DroneATLAS turns the workflow into a polished research platform. | Platform mockup with projects, areas, layers, ML runs. |
| 10 | Drag, Drop, Process | Researchers add drone data and run the pipeline. | Upload/process workflow over the map. |
| 11 | Explore The Site | The platform becomes a spatial research workspace. | Cinematic map, drone flight, stacked sensor layers. |
| 12 | From Prediction To Archaeological Insight | ML output becomes a 3D probability surface for expert interpretation. | Raised glowing ML result on the map. |

## Full Speaker Script

### 1. In Search Of A Castle

I want to start with a real archaeological case.

A medieval castle disappeared from the landscape.

The traces are still there, but only as faint signals across drone sensor layers.

DroneML helps archaeologists find those signals.

DroneATLAS makes that workflow accessible as a research platform.

The case is 't Huijs ten Bosch near Weesp. It was built after 1220 and destroyed in 1672. Today, it is no longer visible as a castle. What remains are subtle clues: cropmarks, thermal differences, elevation changes, and geometric patterns in the soil.

That is the scientific challenge. The evidence is there, but it is distributed across sensor layers that need expert interpretation.

### 2. The Collaboration

This project is also a collaboration story.

4D Research Lab at the University of Amsterdam brings the archaeological expertise: fieldwork, drone sensing, sensor interpretation, and the real research question.

The Netherlands eScience Center brings research software engineering: machine learning, software architecture, usability, testing, and reusable infrastructure.

The wider collaboration includes Leiden Archaeological Sciences, the Netherlands Forensic Institute, the Gemeente Amsterdam context for the Weesp case, and communities such as CAA and AARG that help test, validate, and reuse the work.

The important point is that the software is not developed in isolation. It comes directly from a real expert workflow.

### 3. The Weesp Use Case

The Weesp site gives us a concrete example.

4D Research Lab investigated the medieval castle site through multiple drone campaigns in February, June, and September 2022. They used optical imagery, thermal infrared sensing, multispectral imagery, and LiDAR.

This matters because the site is not visible in one simple image. Different seasons and sensors reveal different parts of the evidence.

The LiDAR campaign alone collected roughly 122 million points. Across the interpretation process, the report documents 55 anomalies. Those include likely castle walls, moat outlines, possible ditches, collapsed wall debris, and later disturbances.

So this is not an abstract dataset. It is a real archaeological investigation with real ambiguity.

### 4. Many Sensors, One Hidden Site

Each sensor sees a different physical signal.

Optical imagery can show cropmarks and soil marks. Thermal infrared can show differences in heat retention, for example where buried stone structures warm and cool differently from surrounding soil. Multispectral data and NDVI can show vegetation stress. LiDAR and elevation models can reveal small changes in terrain morphology.

The castle is not simply visible. It emerges when these layers are compared.

That is why multi-sensor drone data is powerful, but also why it is difficult to interpret.

### 5. The Interpretation Bottleneck

This creates the bottleneck.

The challenge is no longer only collecting data. Drones can generate very high-resolution data quickly. The challenge is interpreting it.

An archaeologist has to inspect many layers, compare them, mark anomalies, assess confidence, and decide whether the pattern may be archaeological, natural, or modern disturbance.

In the Weesp report, this process led to 55 documented anomalies. That is valuable expert work, but it is slow, subjective, and hard to scale to larger sites or repeated surveys.

This is where DroneML enters the story.

### 6. DroneML: The Core

DroneML is the core machine-learning method.

It is designed to help find anomaly patterns in multi-sensor drone data. This is important: we are not detecting simple objects like cars or buildings. Archaeological evidence is fuzzy, incomplete, and context-dependent.

The software supports interpretation. It does not replace archaeological judgement.

The goal is to surface candidate signals so the archaeologist can focus attention where the data suggests something meaningful may be present.

### 7. How The Machine Learning Works

The workflow keeps the expert in the loop.

The archaeologist marks positive examples: areas that look relevant. They also mark negative examples: areas that should not be treated as archaeological signals, such as modern tracks, vegetation noise, or irrelevant texture.

DroneML then combines two machine-learning strengths.

A pretrained UNet extracts spatial features from the raster data. A RandomForest classifier is trained on those features using the small number of expert labels.

The result is a probability map per pixel. It can be generated quickly enough to support interactive exploration, so the user can label, run, inspect, and refine.

### 8. CoeusAI And Pycoeus

The original DroneML work produced concrete research software.

CoeusAI is the QGIS plugin. It makes the workflow usable inside a familiar open-source GIS environment.

Pycoeus is the Python and command-line core. It makes the method reusable beyond the interface: in scripts, services, and pipelines.

That separation is important from a research software engineering perspective. CoeusAI gives domain researchers access to the workflow. Pycoeus gives the method a reusable software foundation.

### 9. DroneATLAS: The Research Platform

DroneATLAS builds on this core.

The goal is to present the DroneML workflow as a researcher-facing platform. A researcher should be able to work with projects, areas, metadata, layers, processing, maps, and machine-learning outputs in one environment.

This is where the workflow becomes more accessible. The user does not start from code. They start from their drone data and their research question.

DroneATLAS is the place where the data, the model, and the spatial interpretation come together.

### 10. Drag, Drop, Process

The platform workflow is simple.

Researchers bring their drone-derived layers into DroneATLAS. The platform organizes those layers, prepares the geospatial data, connects the processing pipeline, runs DroneML through the analytical core, and returns the output as a map layer.

That output is not just a file on disk. It comes back into the research environment where it can be compared, inspected, and interpreted together with the original sensor layers.

This is the bridge between DroneML and DroneATLAS: DroneML is the engine, DroneATLAS is the platform experience.

### 11. Explore The Site

Now we move from the explanation into the spatial demo.

Here the platform becomes a research workspace. We can move into the site, follow the drone survey path, and see how the sensor layers relate to the landscape.

This is the cinematic part of the presentation, but it is still part of the argument. The point is not just to make the map look impressive. The point is to make the workflow visible: data capture, layered evidence, spatial comparison, and interpretation.

### 12. From Prediction To Archaeological Insight

The final result is the machine-learning output as a spatial probability surface.

The model does not tell us archaeological truth. It tells us where the signal may be strongest. It helps identify where expert attention should focus: possible wall traces, moat edges, buried stone material, or other anomalies.

This is the value of the full workflow.

DroneML makes the hidden signal detectable.

DroneATLAS makes the workflow accessible, visual, and reusable.

And for research software engineering, that is the point: not just code, but scientific infrastructure that helps researchers see and interpret evidence they could otherwise miss.

## Memorization Version

### 1. In Search Of A Castle

A medieval castle disappeared from the landscape. The traces are still there, but only as faint signals across drone sensor layers. DroneML helps archaeologists find those signals. DroneATLAS makes that workflow accessible as a research platform.

### 2. The Collaboration

4D Research Lab brings archaeology and drone sensing. The eScience Center brings RSE, machine learning, and reusable software. Partners and communities help validate whether the software is useful in real research.

### 3. The Weesp Use Case

At 't Huijs ten Bosch near Weesp, 4D Research Lab used optical, thermal, multispectral, and LiDAR drone surveys across several seasons. The report documents 55 anomalies, including castle walls, moat traces, ditches, and wall debris.

### 4. Many Sensors

Each sensor sees a different clue. Optical shows cropmarks. Thermal shows heat differences. NDVI shows vegetation stress. LiDAR shows microtopography. The site appears when those layers are compared.

### 5. Bottleneck

The bottleneck is interpretation. Experts have to inspect many layers, mark anomalies, assess confidence, and decide what may be archaeological. That work is valuable but hard to scale.

### 6. DroneML Core

DroneML is the core machine-learning method. It supports anomaly detection in multi-sensor drone data. It helps surface candidate signals, while the archaeologist remains responsible for interpretation.

### 7. Machine Learning

The expert marks positive and negative examples. A pretrained UNet extracts features. A RandomForest learns from the labels. The output is a probability map per pixel, fast enough for interactive exploration.

### 8. CoeusAI And Pycoeus

CoeusAI makes the workflow usable inside QGIS. Pycoeus makes the analytical core reusable in Python, command-line workflows, and services. That is strong research software engineering.

### 9. DroneATLAS Platform

DroneATLAS turns the DroneML workflow into a research platform. Researchers work with projects, areas, metadata, layers, maps, processing, and outputs in one place.

### 10. Drag, Drop, Process

Researchers add drone-derived layers. DroneATLAS organizes the data, runs the DroneML pipeline, and returns the result as a map layer for comparison and interpretation.

### 11. Explore The Site

The platform becomes a spatial workspace. We move into the site, follow the drone path, and inspect stacked sensor evidence directly on the map.

### 12. Insight

The model returns a probability surface. It does not declare archaeological truth; it shows where the buried signal may be strongest and where expert interpretation should focus.

## One-Minute Backup Version

DroneML started from a real archaeological challenge. At Weesp, a medieval castle is no longer visible as a castle, but its traces remain in drone sensor data: optical cropmarks, thermal differences, multispectral vegetation signals, and LiDAR elevation changes.

The problem is interpretation. 4D Research Lab documented 55 anomalies by comparing many layers manually. DroneML supports that expert process with interactive machine learning: positive and negative labels, UNet feature extraction, RandomForest classification, and a probability map per pixel.

CoeusAI made this usable in QGIS. Pycoeus made the method reusable as a Python core. DroneATLAS builds on that by turning the workflow into a platform where researchers add drone imagery, run the pipeline, and inspect the result visually on a map.

The final point is simple: DroneML makes hidden signals detectable. DroneATLAS makes the workflow accessible, visual, and reusable.

## Live Demo Controls

| Key | Action |
|-----|--------|
| Right arrow / PageDown | Next slide. Starts the deck if it has not started. |
| Space | Pause/resume. At the end of a slide, advances to the next slide. |
| Left arrow / PageUp | Previous slide or restart current slide. |
| R / Home | Reset to the beginning. |
| N | Toggle presenter notes. |
| Click | Advance when the current slide has ended. |

## Image Placeholder Notes

Optional local slide images live in `web/static/demo/weesp/`. The deck displays styled placeholders when files are missing, so you can add visuals gradually without breaking the presentation. The full filename list is documented in `docs/DEMO.md`.

## Key Lines To Memorize

- A medieval castle disappeared from the landscape.
- The traces are still there, but only as faint signals across drone sensor layers.
- DroneML helps archaeologists find those signals.
- DroneATLAS makes that workflow accessible as a research platform.
- The bottleneck is interpretation, not just data capture.
- We are not detecting simple objects. We are supporting expert interpretation of fuzzy anomalies.
- DroneML is the engine. DroneATLAS is the platform experience.
- The model does not declare archaeological truth; it shows where the signal may be strongest.
- DroneML makes hidden signals detectable. DroneATLAS makes the workflow accessible, visual, and reusable.

## Source Points Used

- eScience Center article: "Anomalies in the Soil: Enhancing Archaeological Discoveries with Machine Learning using CoeusAI".
- Waagen, J. (2023). 4DRL Report Series 4 - In search of a castle: Multisensor UAS research at the Medieval site of 't Huijs ten Bosch, Weesp. DOI: 10.21942/uva.23375486.v3. CC BY 4.0.
- DroneML project page in the Research Software Directory.
- CoeusAI and Pycoeus pages in the Research Software Directory.
- DroneATLAS project planning notes and diagram material.
