import type { Map as MaplibreMap } from 'maplibre-gl';

export type AnnotationCoordinate = [number, number];

export type AnnotationFeature = {
	type: 'Feature';
	properties: { id: string; active?: boolean };
	geometry: { type: 'LineString'; coordinates: AnnotationCoordinate[] };
};

const annotationsSourceId = 'annotation-drawings';
const annotationsHaloLayerId = 'annotation-drawings-halo';
const annotationsLayerId = 'annotation-drawings-line';

export function buildAnnotationCollection(
	annotationFeatures: AnnotationFeature[],
	activeAnnotation: AnnotationCoordinate[]
) {
	const features = [...annotationFeatures];
	if (activeAnnotation.length > 1) {
		features.push({
			type: 'Feature',
			properties: { id: 'active', active: true },
			geometry: { type: 'LineString', coordinates: activeAnnotation }
		});
	}

	return {
		type: 'FeatureCollection',
		features
	};
}

export function ensureAnnotationLayers(
	map: MaplibreMap | null,
	isStyleLoaded: boolean,
	annotationFeatures: AnnotationFeature[],
	activeAnnotation: AnnotationCoordinate[]
) {
	if (!map || !isStyleLoaded) return;

	if (!map.getSource(annotationsSourceId)) {
		map.addSource(annotationsSourceId, {
			type: 'geojson',
			data: buildAnnotationCollection(annotationFeatures, activeAnnotation) as any
		});
	}

	if (!map.getLayer(annotationsHaloLayerId)) {
		map.addLayer({
			id: annotationsHaloLayerId,
			type: 'line',
			source: annotationsSourceId,
			paint: {
				'line-color': '#06131f',
				'line-width': ['case', ['boolean', ['get', 'active'], false], 8, 7],
				'line-opacity': 0.55,
				'line-blur': 2
			}
		} as any);
	}

	if (!map.getLayer(annotationsLayerId)) {
		map.addLayer({
			id: annotationsLayerId,
			type: 'line',
			source: annotationsSourceId,
			paint: {
				'line-color': ['case', ['boolean', ['get', 'active'], false], '#ffb84d', '#39d2ff'],
				'line-width': ['case', ['boolean', ['get', 'active'], false], 4, 3],
				'line-opacity': 0.95
			}
		} as any);
	}

	moveAnnotationLayersToTop(map);
}

export function syncAnnotationLayers(
	map: MaplibreMap | null,
	isStyleLoaded: boolean,
	annotationFeatures: AnnotationFeature[],
	activeAnnotation: AnnotationCoordinate[]
) {
	if (!map || !isStyleLoaded) return;
	ensureAnnotationLayers(map, isStyleLoaded, annotationFeatures, activeAnnotation);
	const source = map.getSource(annotationsSourceId) as
		| { setData?: (data: any) => void }
		| undefined;
	source?.setData?.(buildAnnotationCollection(annotationFeatures, activeAnnotation));
	moveAnnotationLayersToTop(map);
}

export function moveAnnotationLayersToTop(map: MaplibreMap | null) {
	if (!map) return;
	for (const layerId of [annotationsHaloLayerId, annotationsLayerId]) {
		if (map.getLayer(layerId)) map.moveLayer(layerId);
	}
}
