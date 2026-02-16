# DroneAtlas

## Project Overview

DroneAtlas is a web-based exploration platform for multi-sensor drone data, developed by the Netherlands eScience Center in collaboration with the University of Amsterdam (4D Research Lab). It provides interactive map-based tools for visualizing, exploring, and analyzing drone-acquired datasets across diverse research domains.

## Tech Stack

The application is built using the following technologies:

*   **Frontend:**
    *   SvelteKit (using Svelte 5 runes API)
    *   TypeScript (strict mode)
    *   Tailwind CSS + DaisyUI
    *   MapLibre GL JS (for the interactive map)
    *   GeoTIFF.js (client-side COG processing directly from R2)
*   **Runtime:**
    *   Bun.js (primary package manager and runtime)
*   **Storage:**
    *   Cloudflare R2 (S3-compatible object storage for COGs)
    *   Direct browser access via HTTP range requests
    *   No database or backend processing required
*   **Deployment & Infrastructure:**
    *   GitHub Pages (production deployment with static site generation)
    *   100% client-side COG processing (no server-side dependencies)

## Key Features

*   **Interactive Map:**
    *   Powered by MapLibre GL JS for displaying geographical data
    *   Multiple base map styles
*   **Direct COG Processing (Client-Side):**
    *   Reads Cloud-Optimized GeoTIFF (COG) files directly from Cloudflare R2 storage
    *   Uses GeoTIFF.js library for browser-based raster processing
    *   HTTP range requests enable efficient partial file loading
    *   Displays COG data using canvas-based rendering with customizable colormaps
    *   Allows users to toggle visibility and adjust opacity of raster layers
    *   Supports loading remote COG layers directly via URL input
    *   Provides global opacity slider to adjust all visible raster layers simultaneously

## Development Setup

### Prerequisites

- **Bun** must be installed on your system
  - Install from [https://bun.sh](https://bun.sh)

### Quick Start

```bash
# Clone the repository
git clone https://github.com/DroneML/DroneAtlas.git
cd DroneAtlas/web

# Install dependencies
bun install

# Start development server
bun run dev          # Runs at localhost:5173
```

### Development Commands

```bash
# Type checking
bun run check        # Svelte-kit sync + type check

# Linting and formatting
bun run lint         # ESLint + Prettier check
bun run format       # Auto-format code

# Building for production
bun run build        # Generate static site
```

## Architecture Overview

### Directory Structure
```
web/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   ├── Map/              # Map system (modular components)
│   │   │   │   ├── components/   # Sub-components
│   │   │   │   ├── store/        # Map-specific state
│   │   │   │   └── utils/        # Map utilities
│   │   │   └── ui/               # Reusable UI components
│   │   ├── stores/               # Global state management
│   │   └── utils/                # General utilities
│   └── routes/                   # SvelteKit pages and layouts
└── static/                       # Static assets
```

### Map Component Architecture

The Map system is modular:
- `Map.svelte` - Main container orchestrating all map functionality
- `MapCore.svelte` - MapLibre instance management
- `MapControls.svelte` - Zoom, rotation, and 3D controls
- `MapSidebar.svelte` - Data explorer sidebar with settings
- `RasterLayerManager.svelte` - COG layer management
- `RasterLegend.svelte` - Raster data legend

## Processing Raster Maps

The repository includes a script for processing raster maps into Cloud Optimized GeoTIFFs (COGs) suitable for web visualization.

### Prerequisites

- GDAL must be installed on your system
  ```bash
  # Install GDAL on macOS using Homebrew
  brew install gdal

  # Install GDAL on Ubuntu/Debian
  sudo apt-get install gdal-bin python3-gdal
  ```

### Using the Script

1. Place your raster files (.tif) in the `data/02_Rasters` directory.

2. Run the conversion script:
   ```bash
   bash process_rasters.sh
   ```

3. The script will:
   - Reproject all rasters to EPSG:4326 (WGS 84) using bilinear resampling
   - Convert them to Cloud Optimized GeoTIFFs with Google Maps Compatible tiling
   - Apply DEFLATE compression to reduce file size
   - Preserve the original directory structure in the output

4. Processed files will be available in the `data/cogs` directory.

## Code Style Guidelines

### TypeScript
- **Strict mode** enabled - no implicit any
- Explicit type annotations for props and function parameters
- Interface definitions for all component props

### Formatting
- **Tabs** for indentation
- **Single quotes** for strings
- **No trailing commas**
- **100 character** line width
- Run `bun run format` before committing

### CSS/Styling
- **Tailwind-first** approach - use utilities over custom CSS
- **DaisyUI components** for complex UI patterns
- **Responsive design** with Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`)

## Environment Configuration

### Required Environment Variables
```bash
# MapTiler API key for map styles
VITE_MAPTILER_KEY=your_maptiler_key

# Cloudflare R2 bucket URL for COG storage
VITE_R2_BUCKET_URL=https://pub-6e8836a7d8be4fd1adc1317bb416ad75.r2.dev

# Optional base path for deployment
BASE_PATH=/optional-path
```

## Testing

The application includes a test suite using Bun's built-in test runner.

```bash
# Run all tests
bun test

# Run tests in watch mode
bun test --watch

# Run tests with coverage report
bun test --coverage
```

For detailed testing documentation, see [tests/README.md](web/tests/README.md).

## Team

- **Jesse Gonzalez** — Netherlands eScience Center
- **Ou Ku** — Netherlands eScience Center
- **Ermanno Lo Cascio** — Netherlands eScience Center

## License

MIT
