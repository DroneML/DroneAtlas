import type { Map as MaplibreMap } from 'maplibre-gl';
import { WEESP_IMAGE_BOUNDS, weespSiteUvToImageUv } from '$lib/demo/weesp';
import type { ProjectLocation } from '$lib/types';

const siteReconstructionSourceId = 'weesp-site-reconstruction';
const siteReconstructionLayerIds = [
	'weesp-site-moat-glow',
	'weesp-site-moat-line',
	'weesp-site-buildings',
	'weesp-site-wall-outlines'
];

const siteReconstructionBaseOpacity: Record<string, number> = {
	'weesp-site-moat-glow': 0.42,
	'weesp-site-moat-line': 0.95,
	'weesp-site-buildings': 1,
	'weesp-site-wall-outlines': 1
};

export function ensureSiteReconstructionLayers(
	map: MaplibreMap | null,
	isStyleLoaded: boolean,
	location: ProjectLocation,
	siteModelVisible: boolean,
	siteModelOpacity: number
) {
	if (!map || !isStyleLoaded) return;

	const data = buildSiteReconstructionData();
	const existingSource = map.getSource(siteReconstructionSourceId) as
		| { setData?: (data: any) => void }
		| undefined;

	if (existingSource?.setData) {
		existingSource.setData(data);
	} else if (!existingSource) {
		map.addSource(siteReconstructionSourceId, {
			type: 'geojson',
			data: data as any
		});
	}

	if (!map.getLayer('weesp-site-moat-glow')) {
		map.addLayer({
			id: 'weesp-site-moat-glow',
			type: 'line',
			source: siteReconstructionSourceId,
			filter: ['==', ['get', 'class'], 'moat'],
			paint: {
				'line-color': '#39d2ff',
				'line-width': 6,
				'line-blur': 5,
				'line-opacity': 0.42
			}
		} as any);
	}

	if (!map.getLayer('weesp-site-moat-line')) {
		map.addLayer({
			id: 'weesp-site-moat-line',
			type: 'line',
			source: siteReconstructionSourceId,
			filter: ['==', ['get', 'class'], 'moat'],
			paint: {
				'line-color': '#39d2ff',
				'line-width': 2,
				'line-opacity': 0.95
			}
		} as any);
	}

	if (!map.getLayer('weesp-site-buildings')) {
		map.addLayer({
			id: 'weesp-site-buildings',
			type: 'fill-extrusion',
			source: siteReconstructionSourceId,
			filter: ['==', ['geometry-type'], 'Polygon'],
			paint: {
				'fill-extrusion-color': ['get', 'color'],
				'fill-extrusion-height': ['get', 'height'],
				'fill-extrusion-base': ['get', 'base'],
				'fill-extrusion-opacity': 1,
				'fill-extrusion-vertical-gradient': false
			}
		} as any);
	}

	if (!map.getLayer('weesp-site-wall-outlines')) {
		map.addLayer({
			id: 'weesp-site-wall-outlines',
			type: 'line',
			source: siteReconstructionSourceId,
			filter: ['==', ['get', 'class'], 'wall-outline'],
			paint: {
				'line-color': '#ff2da8',
				'line-width': 2.2,
				'line-opacity': 1
			}
		} as any);
	}

	setSiteReconstructionVisibility(map, siteModelVisible);
	setSiteReconstructionOpacity(map, siteModelOpacity);
	moveSiteReconstructionLayersToTop(map);
}

export function setSiteReconstructionVisibility(map: MaplibreMap | null, visible: boolean) {
	if (!map) return;
	const visibility = visible ? 'visible' : 'none';
	for (const layerId of siteReconstructionLayerIds) {
		if (map.getLayer(layerId)) map.setLayoutProperty(layerId, 'visibility', visibility);
	}
}

export function setSiteReconstructionOpacity(map: MaplibreMap | null, opacityPercent: number) {
	if (!map) return;
	const opacity = Math.max(0, Math.min(1, opacityPercent / 100));
	for (const layerId of siteReconstructionLayerIds) {
		if (!map.getLayer(layerId)) continue;
		const value = (siteReconstructionBaseOpacity[layerId] ?? 1) * opacity;
		if (layerId === 'weesp-site-buildings') {
			map.setPaintProperty(layerId, 'fill-extrusion-opacity', value);
		} else {
			map.setPaintProperty(layerId, 'line-opacity', value);
		}
	}
}

export function removeSiteReconstructionLayers(map: MaplibreMap | null) {
	if (!map) return;
	for (const layerId of [...siteReconstructionLayerIds].reverse()) {
		if (map.getLayer(layerId)) map.removeLayer(layerId);
	}
	if (map.getSource(siteReconstructionSourceId)) map.removeSource(siteReconstructionSourceId);
}

export function moveSiteReconstructionLayersToTop(map: MaplibreMap | null) {
	if (!map) return;
	for (const layerId of siteReconstructionLayerIds) {
		if (map.getLayer(layerId)) map.moveLayer(layerId);
	}
}

function buildSiteReconstructionData() {
	const uvToLngLat = (u: number, v: number): [number, number] => {
		const [imageU, imageV] = weespSiteUvToImageUv(u, v);
		const [west, south, east, north] = WEESP_IMAGE_BOUNDS;
		return [west + imageU * (east - west), north - imageV * (north - south)];
	};
	const rectPoints = (left: number, top: number, right: number, bottom: number) =>
		[
			[left, top],
			[right, top],
			[right, bottom],
			[left, bottom]
		] as Array<[number, number]>;
	const closeRing = (points: Array<[number, number]>) =>
		[...points, points[0]].map(([u, v]) => uvToLngLat(u, v));

	const polygon = (
		id: string,
		points: Array<[number, number]>,
		height: number,
		color = '#ff2da8',
		base = 1
	) => ({
		type: 'Feature',
		properties: { id, height, base, color },
		geometry: {
			type: 'Polygon',
			coordinates: [closeRing(points)]
		}
	});
	const ring = (
		id: string,
		outer: [number, number, number, number],
		inner: [number, number, number, number],
		height: number,
		color = '#d98528',
		base = 0.6
	) => ({
		type: 'Feature',
		properties: { id, height, base, color },
		geometry: {
			type: 'Polygon',
			coordinates: [closeRing(rectPoints(...outer)), closeRing([...rectPoints(...inner)].reverse())]
		}
	});

	const box = (
		id: string,
		left: number,
		top: number,
		right: number,
		bottom: number,
		height: number,
		color?: string
	) => polygon(id, rectPoints(left, top, right, bottom), height, color);

	const rectLine = (
		id: string,
		className: string,
		left: number,
		top: number,
		right: number,
		bottom: number
	) =>
		line(id, className, [
			[left, top],
			[right, top],
			[right, bottom],
			[left, bottom]
		]);

	const line = (id: string, className: string, points: Array<[number, number]>, close = true) => ({
		type: 'Feature',
		properties: { id, class: className },
		geometry: {
			type: 'LineString',
			coordinates: (close ? [...points, points[0]] : points).map(([u, v]) => uvToLngLat(u, v))
		}
	});

	return {
		type: 'FeatureCollection',
		features: [
			ring('outer-wall-trace', [0.315, 0.2, 0.795, 0.73], [0.345, 0.235, 0.765, 0.695], 1.5),
			ring('inner-wall-trace', [0.405, 0.265, 0.735, 0.63], [0.435, 0.3, 0.705, 0.595], 2.2),
			ring(
				'central-tower-trace',
				[0.54, 0.41, 0.625, 0.515],
				[0.57, 0.445, 0.595, 0.48],
				8.8,
				'#ff2da8'
			),
			box('west-annex-trace', 0.425, 0.465, 0.485, 0.53, 3.6, '#cc2cff'),
			box('south-hall-trace', 0.405, 0.575, 0.63, 0.68, 1.8, '#bd246f'),
			box('south-gate-hotspot', 0.33, 0.705, 0.39, 0.775, 1.2, '#b77b23'),
			rectLine('outer-moat', 'moat', 0.25, 0.125, 0.86, 0.805),
			rectLine('inner-moat', 'moat', 0.395, 0.255, 0.745, 0.64),
			rectLine('outer-wall-outline', 'wall-outline', 0.315, 0.2, 0.795, 0.73),
			rectLine('inner-wall-outline', 'wall-outline', 0.405, 0.265, 0.735, 0.63),
			rectLine('tower-outline', 'wall-outline', 0.54, 0.41, 0.625, 0.515),
			rectLine('west-annex-outline', 'wall-outline', 0.425, 0.465, 0.485, 0.53),
			rectLine('hall-outline', 'wall-outline', 0.405, 0.575, 0.63, 0.68)
		]
	};
}
