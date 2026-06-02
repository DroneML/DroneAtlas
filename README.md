# DroneAtlas

[![Test](https://github.com/DroneML/DroneAtlas/actions/workflows/test.yml/badge.svg)](https://github.com/DroneML/DroneAtlas/actions/workflows/test.yml)
[![Deploy to GitHub Pages](https://github.com/DroneML/DroneAtlas/actions/workflows/deploy.yml/badge.svg)](https://github.com/DroneML/DroneAtlas/actions/workflows/deploy.yml)
[![License](https://img.shields.io/github/license/DroneML/DroneAtlas)](LICENSE)
[![DOI](https://img.shields.io/badge/archiving-Zenodo-1682d4)](#citation-and-archiving)
[![Built with SvelteKit](https://img.shields.io/badge/SvelteKit-5-ff3e00)](https://svelte.dev/docs/kit)
[![Runtime: Bun](https://img.shields.io/badge/runtime-Bun-000000)](https://bun.sh/)

DroneAtlas is a web-based exploration platform for multi-sensor drone data, developed by the Netherlands eScience Center in collaboration with the University of Amsterdam 4D Research Lab. It provides interactive map-based tools for visualizing, exploring, and analyzing drone-acquired datasets, including Cloud Optimized GeoTIFF rasters, project locations, and a presentation-oriented drone analytics demo.

## Features

- Interactive MapLibre GL map with multiple map styles and client-side overlays.
- Cloud Optimized GeoTIFF loading from Cloudflare R2 using browser-side range requests.
- Raster layer controls for visibility, opacity, color maps, and hover/click value inspection.
- Project/location workflow for drone case studies, including Weesp demo layers and analytics.
- Demo presentation route with timeline playback, sensor overlays, detections, and 3D visuals.
- Static SvelteKit deployment to GitHub Pages with no database or server runtime required.

## Tech Stack

| Area                        | Technology                                    |
| --------------------------- | --------------------------------------------- |
| Web framework               | SvelteKit 5, Svelte 5, TypeScript             |
| Styling                     | Tailwind CSS, DaisyUI                         |
| Mapping                     | MapLibre GL JS                                |
| Raster processing           | GeoTIFF.js, Cloud Optimized GeoTIFFs          |
| Runtime and package manager | Bun                                           |
| Storage                     | Cloudflare R2 or any HTTP-accessible COG host |
| Deployment                  | GitHub Pages, static adapter                  |

## Repository Layout

```text
.
├── .github/workflows/      # CI and GitHub Pages deployment
├── CITATION.cff            # Citation metadata for GitHub and Zenodo
├── LICENSE                 # Apache-2.0 license
├── README.md               # Project overview
└── web/                    # SvelteKit application
    ├── src/                # Application source
    ├── static/             # Static data and demo assets
    └── tests/              # Unit, integration, fixtures, and helpers
```

## Getting Started

### Prerequisites

- Bun, installed from <https://bun.sh/>.
- Node.js 20 or newer for tools that expect a Node runtime.
- A MapTiler key for production-quality basemaps.

### Install and Run

```bash
git clone https://github.com/DroneML/DroneAtlas.git
cd DroneAtlas/web
bun install
bun run dev
```

The development server runs at the Vite URL printed by the command, usually <http://localhost:5173>.

### Environment Variables

Create `web/.env` when local values are needed:

```bash
VITE_MAPTILER_KEY=your_maptiler_key
VITE_R2_BUCKET_URL=https://example-r2-bucket.r2.dev
VITE_R2_POINTS_BASE_URL=https://example-r2-bucket.r2.dev
BASE_PATH=/optional-deployment-base-path
```

## Development Commands

Run commands from `web/`.

| Command                 | Purpose                                         |
| ----------------------- | ----------------------------------------------- |
| `bun run dev`           | Start the development server                    |
| `bun run check`         | Run SvelteKit sync and TypeScript/Svelte checks |
| `bun run lint`          | Run Prettier check and ESLint                   |
| `bun run format`        | Format source files                             |
| `bun test`              | Run all tests                                   |
| `bun run test:coverage` | Run tests with Bun coverage output              |
| `bun run build`         | Build the static site                           |
| `bun run preview`       | Preview the production build locally            |

## Testing

DroneAtlas has a Bun-native test suite covering geospatial utilities, raster processing, stores, data processing flows, routes, generated manifests, and demo timeline logic.

Current local status after this update:

| Metric     | Value       |
| ---------- | ----------- |
| Tests      | 300 passing |
| Test files | 25          |
| Assertions | 741         |
| Runner     | Bun test    |

Run the suite with:

```bash
cd web
bun test
```

More details are in [`web/tests/README.md`](web/tests/README.md).

## Data and Deployment

The application is designed for static hosting. Raster and point datasets are loaded from HTTP endpoints, typically Cloudflare R2. Cloud Optimized GeoTIFFs are processed in the browser, so deployment does not require a database or backend service.

GitHub Pages deployment is handled by [`deploy.yml`](.github/workflows/deploy.yml). The separate [`test.yml`](.github/workflows/test.yml) workflow runs type checks and the test suite on pushes and pull requests.

## Citation and Archiving

If you use DroneAtlas in research, cite it using [`CITATION.cff`](CITATION.cff). GitHub can render this file through the repository's "Cite this repository" button.

The repository includes [`.zenodo.json`](.zenodo.json) so releases can be archived on Zenodo with consistent metadata. To publish a citable release:

1. Enable the DroneAtlas repository in Zenodo or the institutional Zenodo community.
2. Create a GitHub release with a semantic version tag such as `v0.1.0`.
3. Let Zenodo archive the release and mint a DOI.
4. Replace the Zenodo badge above with the minted DOI badge.
5. Update `CITATION.cff` with the released version, release date, and DOI.

## License

DroneAtlas is licensed under the [Apache License 2.0](LICENSE).

## Team

- Jesse Gonzalez, Netherlands eScience Center
- Ou Ku, Netherlands eScience Center
- Ermanno Lo Cascio, Netherlands eScience Center
- Netherlands eScience Center
- University of Amsterdam, 4D Research Lab
