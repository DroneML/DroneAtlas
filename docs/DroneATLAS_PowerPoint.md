---
title: "DroneML + DroneATLAS"
subtitle: "In search of a castle"
author: "Netherlands eScience Center / 4D Research Lab"
date: "2026"
---

## In Search Of A Castle

**A medieval castle disappeared from the landscape.**

The traces are still there, but only as faint signals across drone sensor layers.

DroneML helps archaeologists find those signals.

DroneATLAS makes that workflow accessible as a research platform.

**Visual placeholder:** `01-historical-castle.jpg` + `02-weesp-field.jpg`

::: notes
I want to start with a real archaeological case.

A medieval castle disappeared from the landscape. The traces are still there, but only as faint signals across drone sensor layers. DroneML helps archaeologists find those signals. DroneATLAS makes that workflow accessible as a research platform.

The case is 't Huijs ten Bosch near Weesp. It was built after 1220 and destroyed in 1672. Today, it is no longer visible as a castle. What remains are subtle clues: cropmarks, thermal differences, elevation changes, and geometric patterns in the soil.
:::

## The Collaboration

**Domain science meets research software engineering.**

- 4D Research Lab / University of Amsterdam: archaeology, drone surveys, sensor interpretation
- Netherlands eScience Center: RSE, machine learning, reusable software
- Leiden Archaeological Sciences and Netherlands Forensic Institute: wider collaboration
- Gemeente Amsterdam and research communities: case context, testing, reuse

**Visual placeholder:** partner cards / logos

::: notes
This project is also a collaboration story. 4D Research Lab brings the archaeological expertise: fieldwork, drone sensing, sensor interpretation, and the real research question.

The Netherlands eScience Center brings research software engineering: machine learning, software architecture, usability, testing, and reusable infrastructure.

The important point is that the software is not developed in isolation. It comes directly from a real expert workflow.
:::

## The Weesp Use Case

**'t Huijs ten Bosch, Weesp**

- Field campaigns in February, June, and September 2022
- Optical, thermal infrared, multispectral, and LiDAR sensors
- Around 122 million LiDAR points collected
- 55 documented anomalies in the interpretation workflow

**Visual placeholder:** `02-weesp-field.jpg` + `03-drone-fieldwork.jpg`

::: notes
The Weesp site gives us a concrete example. 4D Research Lab investigated the medieval castle site through multiple drone campaigns in February, June, and September 2022.

They used optical imagery, thermal infrared sensing, multispectral imagery, and LiDAR. The LiDAR campaign alone collected roughly 122 million points. Across the interpretation process, the report documents 55 anomalies.

This is not an abstract dataset. It is a real archaeological investigation with real ambiguity.
:::

## Many Sensors, One Hidden Site

**Each sensor captures a different clue.**

- Optical: cropmarks and soil marks
- Thermal infrared: heat-retention differences
- NDVI / multispectral: vegetation stress
- LiDAR / DTM: microtopography and earthworks

The site appears when these layers are compared.

**Visual placeholders:** `05-optical-annotated.jpg`, `06-thermal-annotated.jpg`, `07-lidar-dtm-annotated.jpg`, `08-ndvi-annotated.jpg`

::: notes
Each sensor sees a different physical signal. Optical imagery can show cropmarks and soil marks. Thermal infrared can show differences in heat retention, for example where buried stone structures warm and cool differently from surrounding soil.

Multispectral data and NDVI can show vegetation stress. LiDAR and elevation models can reveal small changes in terrain morphology.

The castle is not simply visible. It emerges when these layers are compared.
:::

## The Interpretation Bottleneck

**The hard part is interpretation at scale.**

Archaeologists inspect many layers, compare them, mark anomalies, assign confidence, and decide whether a pattern may be archaeological.

In the Weesp report, this produced **55 documented anomalies**.

**Visual placeholder:** `09-all-anomalies.jpg`

::: notes
This creates the bottleneck. The challenge is no longer only collecting data. Drones can generate very high-resolution data quickly. The challenge is interpreting it.

An archaeologist has to inspect many layers, compare them, mark anomalies, assess confidence, and decide whether the pattern may be archaeological, natural, or modern disturbance.

That work is valuable, but it is slow and hard to scale to larger sites or repeated surveys.
:::

## DroneML: The Core

**Find anomaly patterns, not simple objects.**

DroneML is the scientific machine-learning engine for multi-sensor drone data.

It supports expert interpretation by surfacing candidate signals across multiband geospatial layers.

**Diagram:** multi-sensor GeoTIFFs -> DroneML engine -> candidate signals

::: notes
DroneML is the core machine-learning method.

It is designed to help find anomaly patterns in multi-sensor drone data. This is important: we are not detecting simple objects like cars or buildings. Archaeological evidence is fuzzy, incomplete, and context-dependent.

The software supports interpretation. It does not replace archaeological judgement.
:::

## How The Machine Learning Works

**Fast feedback keeps the expert in the loop.**

1. Expert marks positive and negative examples
2. A pretrained UNet extracts spatial features
3. A RandomForest classifier learns from the labels
4. The output is a probability map per pixel

**Visual placeholder:** `10-coeus-probability.png`

::: notes
The workflow keeps the expert in the loop. The archaeologist marks positive examples: areas that look relevant. They also mark negative examples: areas that should not be treated as archaeological signals.

DroneML combines two machine-learning strengths. A pretrained UNet extracts spatial features from the raster data. A RandomForest classifier is trained on those features using the small number of expert labels.

The result is a probability map per pixel, fast enough to support interactive exploration.
:::

## CoeusAI And Pycoeus

**Usable interface. Reusable analytical core.**

- CoeusAI: QGIS plugin for the interactive workflow
- Pycoeus: Python and command-line core
- Separation of usability and reusable infrastructure

**Visual placeholders:** `10-coeus-probability.png` + `11-coeus-qgis.jpg`

::: notes
The original DroneML work produced concrete research software.

CoeusAI is the QGIS plugin. It makes the workflow usable inside a familiar open-source GIS environment. Pycoeus is the Python and command-line core. It makes the method reusable beyond the interface: in scripts, services, and pipelines.

That separation is important from a research software engineering perspective.
:::

## DroneATLAS: The Research Platform

**The DroneML workflow as a research environment.**

Researchers work with projects, areas, metadata, layers, processing, maps, and machine-learning outputs in one place.

DroneML is the engine.

DroneATLAS is the platform experience.

**Visual placeholder:** `12-droneatlas-platform.jpg`

::: notes
DroneATLAS builds on this core. The goal is to present the DroneML workflow as a researcher-facing platform.

A researcher should be able to work with projects, areas, metadata, layers, processing, maps, and machine-learning outputs in one environment.

This is where the workflow becomes more accessible. The user does not start from code. They start from their drone data and their research question.
:::

## Drag, Drop, Process

**Drone imagery becomes geospatial ML output.**

1. Add drone-derived layers
2. Organize sensor data and metadata
3. Run the DroneML / Pycoeus pipeline
4. Return the probability map to the research workspace

**Visual placeholder:** `13-drag-drop-process.jpg`

::: notes
The platform workflow is simple. Researchers bring their drone-derived layers into DroneATLAS.

The platform organizes those layers, prepares the geospatial data, connects the processing pipeline, runs DroneML through the analytical core, and returns the output as a map layer.

That output is not just a file on disk. It comes back into the research environment where it can be compared, inspected, and interpreted together with the original sensor layers.
:::

## Explore The Site

**The map becomes the research workspace.**

Switch to demo or play embedded video.

Show:

- drone flight over the site
- sensor layers in context
- map-based spatial exploration

**Video placeholder:** `droneatlas-map-exploration.mp4`

::: notes
Now we move from the explanation into the spatial demo.

Here the platform becomes a research workspace. We can move into the site, follow the drone survey path, and see how the sensor layers relate to the landscape.

This is the cinematic part of the presentation, but it is still part of the argument. The point is to make the workflow visible: data capture, layered evidence, spatial comparison, and interpretation.
:::

## From Prediction To Archaeological Insight

**A 3D probability surface for expert interpretation.**

The model does not declare archaeological truth.

It shows where the buried signal may be strongest, and where expert interpretation should focus.

**Video placeholder:** `droneatlas-3d-probability-surface.mp4`

::: notes
The final result is the machine-learning output as a spatial probability surface.

The model does not tell us archaeological truth. It tells us where the signal may be strongest. It helps identify where expert attention should focus: possible wall traces, moat edges, buried stone material, or other anomalies.

DroneML makes the hidden signal detectable. DroneATLAS makes the workflow accessible, visual, and reusable.
:::

## Closing

**DroneML makes hidden signals detectable.**

**DroneATLAS makes the workflow accessible, visual, and reusable.**

Research software engineering turns a complex expert method into scientific infrastructure.

::: notes
For research software engineering, that is the point: not just code, but scientific infrastructure that helps researchers see and interpret evidence they could otherwise miss.
:::
