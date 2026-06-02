# DroneAtlas Web Application

This directory contains the SvelteKit application for DroneAtlas.

For the full project overview, citation, Zenodo archiving instructions, license, and repository-level setup, see the [top-level README](../README.md).

## Quick Start

```bash
bun install
bun run dev
```

## Commands

| Command                 | Purpose                             |
| ----------------------- | ----------------------------------- |
| `bun run dev`           | Start the development server        |
| `bun run check`         | Run SvelteKit and TypeScript checks |
| `bun run lint`          | Run formatting and ESLint checks    |
| `bun run format`        | Format project files                |
| `bun test`              | Run the Bun test suite              |
| `bun run test:coverage` | Run tests with coverage output      |
| `bun run build`         | Build the static site               |

## Test Suite

The app has a Bun-native unit and integration test suite covering geospatial utilities, raster behavior, stores, routes, and demo timeline logic. See [`tests/README.md`](tests/README.md) for details.
