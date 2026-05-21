# Weesp Demo Rasters

Deterministic local GeoTIFFs for the main-route DroneML demo case:

- `optical_cropmarks.tif`
- `thermal_contrast.tif`
- `ndvi.tif`
- `lidar_dtm.tif`
- `droneml_probability.tif`

They are synthetic stand-ins structured around the Weesp / `'t Huijs ten Bosch` paper workflow, not the original sensor measurements. Their GeoTIFF bounds are placed over the approximate castle-field footprint near Gooilandseweg 7, Weesp. Regenerate them with:

```bash
bun run scripts/generate-weesp-demo-rasters.ts
```
