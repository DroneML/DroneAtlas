# DroneAtlas Test Suite

DroneAtlas uses Bun's built-in test runner for fast unit and integration tests. The suite focuses on deterministic logic that can be verified without a live browser or external data services.

## Current Status

| Metric     | Value       |
| ---------- | ----------- |
| Tests      | 300 passing |
| Test files | 25          |
| Assertions | 741         |
| Runner     | Bun test    |

## Coverage Areas

- CSV processing and GeoJSON conversion.
- Raster metadata lookup, raster click/hover behavior, and GeoTIFF coordinate utilities.
- Map visualization utilities for colors, heatmaps, bars, pie charts, overlap detection, and annotation layers.
- Svelte stores for filters, projects, raster layers, and derived state.
- Route smoke tests for the root, about, demo, layout, and R2 manifest endpoint.
- Demo timeline and flight-path utilities.
- Integration coverage for the CSV to GeoJSON to filtering pipeline.

## Directory Structure

```text
tests/
├── fixtures/       # Stable CSV and GeoJSON fixture data
├── helpers/        # Mocks, factories, and coverage helpers
├── integration/    # Cross-module workflow tests
├── setup/          # Global test environment setup
└── unit/           # Isolated module tests
```

## Commands

Run from `web/`.

```bash
bun test
bun test --watch
bun test --coverage
bun run test:coverage:check
```

Run a focused file or directory:

```bash
bun test tests/unit/utils/rasterPixelQuery.test.ts
bun test tests/unit/stores
```

## Test Design

- Keep tests deterministic and independent.
- Prefer real pure functions and stores over mocks.
- Mock browser-only APIs, MapLibre, GeoTIFF, and network calls at the boundary.
- Cover edge cases such as empty datasets, malformed inputs, out-of-bounds coordinates, no-data raster values, and failed external manifests.
- Add integration tests when a feature spans parsing, store state, and map behavior.

## CI

The repository runs tests in GitHub Actions through `.github/workflows/test.yml` on pushes, pull requests, and manual dispatches. The workflow installs dependencies with Bun, runs `bun run check`, and then runs `bun test`.

## Known Limits

- Visual rendering and full browser interaction are not covered by the Bun suite.
- Browser APIs are mocked, so canvas and WebGL output still need browser-level verification when changing visual behavior.
- Bun coverage output is useful for local checks, but line-level coverage should be interpreted alongside code review.
