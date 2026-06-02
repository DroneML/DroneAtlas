# DroneAtlas

[![Test](https://github.com/DroneML/DroneAtlas/actions/workflows/test.yml/badge.svg)](https://github.com/DroneML/DroneAtlas/actions/workflows/test.yml)
[![Deploy to GitHub Pages](https://github.com/DroneML/DroneAtlas/actions/workflows/deploy.yml/badge.svg)](https://github.com/DroneML/DroneAtlas/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/DroneML/DroneAtlas)](LICENSE)
[![DOI](https://img.shields.io/badge/archiving-Zenodo-1682d4)](https://zenodo.org/)

DroneAtlas is a web-based exploration platform for multi-sensor drone data, developed by the Netherlands eScience Center in collaboration with the University of Amsterdam 4D Research Lab.

It provides interactive map-based tools for visualizing, exploring, and analyzing drone-acquired datasets, including Cloud Optimized GeoTIFF rasters, project locations, and a presentation-oriented drone analytics demo.

## Features

- Interactive MapLibre GL map with client-side overlays.
- Browser-side Cloud Optimized GeoTIFF loading and value inspection.
- Project/location workflow for drone case studies.
- Demo presentation route with timeline playback, sensor overlays, detections, and 3D visuals.
- Static SvelteKit deployment with no database or server runtime required.

## Links

- [Development guide](DEV.md)
- [Web application](web/README.md)
- [Test suite](web/tests/README.md)
- [Citation metadata](CITATION.cff)
- [Apache-2.0 license](LICENSE)

## Citation

If you use DroneAtlas in research, cite it using [`CITATION.cff`](CITATION.cff). Releases are prepared for Zenodo archival using [`.zenodo.json`](.zenodo.json).

## Team

- Jesse Gonzalez, Netherlands eScience Center
- Ou Ku, Netherlands eScience Center
- Ermanno Lo Cascio, Netherlands eScience Center
- Netherlands eScience Center
- University of Amsterdam, 4D Research Lab
