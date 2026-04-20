export const COLORMAPS: Record<string, { stop: number; color: string }[]> = {
	viridis: [
		{ stop: 0, color: 'rgb(68, 1, 84)' },
		{ stop: 0.11, color: 'rgb(72, 40, 120)' },
		{ stop: 0.22, color: 'rgb(62, 73, 137)' },
		{ stop: 0.33, color: 'rgb(49, 104, 142)' },
		{ stop: 0.44, color: 'rgb(38, 130, 142)' },
		{ stop: 0.55, color: 'rgb(31, 158, 137)' },
		{ stop: 0.66, color: 'rgb(53, 183, 121)' },
		{ stop: 0.77, color: 'rgb(109, 205, 89)' },
		{ stop: 0.88, color: 'rgb(180, 222, 44)' },
		{ stop: 1, color: 'rgb(253, 231, 37)' }
	],
	inferno: [
		{ stop: 0, color: 'rgb(0, 0, 4)' },
		{ stop: 0.13, color: 'rgb(40, 11, 84)' },
		{ stop: 0.25, color: 'rgb(101, 21, 110)' },
		{ stop: 0.38, color: 'rgb(159, 42, 99)' },
		{ stop: 0.5, color: 'rgb(212, 72, 66)' },
		{ stop: 0.63, color: 'rgb(245, 125, 21)' },
		{ stop: 0.75, color: 'rgb(250, 193, 39)' },
		{ stop: 0.88, color: 'rgb(252, 255, 164)' },
		{ stop: 1, color: 'rgb(252, 255, 164)' }
	],
	plasma: [
		{ stop: 0, color: 'rgb(13, 8, 135)' },
		{ stop: 0.13, color: 'rgb(75, 3, 161)' },
		{ stop: 0.25, color: 'rgb(125, 3, 168)' },
		{ stop: 0.38, color: 'rgb(168, 34, 150)' },
		{ stop: 0.5, color: 'rgb(203, 70, 121)' },
		{ stop: 0.63, color: 'rgb(229, 107, 93)' },
		{ stop: 0.75, color: 'rgb(248, 148, 65)' },
		{ stop: 0.88, color: 'rgb(253, 195, 40)' },
		{ stop: 1, color: 'rgb(240, 249, 33)' }
	],
	magma: [
		{ stop: 0, color: 'rgb(0, 0, 4)' },
		{ stop: 0.13, color: 'rgb(28, 16, 68)' },
		{ stop: 0.25, color: 'rgb(79, 18, 123)' },
		{ stop: 0.38, color: 'rgb(129, 37, 129)' },
		{ stop: 0.5, color: 'rgb(181, 54, 122)' },
		{ stop: 0.63, color: 'rgb(229, 89, 100)' },
		{ stop: 0.75, color: 'rgb(251, 135, 97)' },
		{ stop: 0.88, color: 'rgb(254, 194, 140)' },
		{ stop: 1, color: 'rgb(252, 253, 191)' }
	],
	terrain: [
		{ stop: 0, color: 'rgb(51, 102, 0)' },
		{ stop: 0.15, color: 'rgb(102, 153, 0)' },
		{ stop: 0.3, color: 'rgb(204, 204, 0)' },
		{ stop: 0.5, color: 'rgb(204, 153, 51)' },
		{ stop: 0.7, color: 'rgb(153, 102, 51)' },
		{ stop: 0.85, color: 'rgb(192, 192, 192)' },
		{ stop: 1, color: 'rgb(255, 255, 255)' }
	]
};

export function getGradientStyle(colormapName: string): string {
	const cm = COLORMAPS[colormapName] ?? COLORMAPS.viridis;
	return `linear-gradient(to right, ${cm.map((c) => `${c.color} ${c.stop * 100}%`).join(', ')})`;
}

export interface LegendInfo {
	title: string;
	unit: string;
}

export function getLegendInfo(layerName: string, layerId: string, layerMetadata?: any): LegendInfo {
	const isProject = layerId.startsWith('project-');

	if (isProject) {
		if (layerName.includes('NDVI')) return { title: 'NDVI', unit: '' };
		if (layerName.includes('Infrared') || layerName.includes('Thermal'))
			return { title: 'Temperature', unit: '°C' };
		if (layerName.includes('LiDAR') || layerName.includes('DSM') || layerName.includes('DTM'))
			return { title: 'Elevation', unit: 'm' };
		if (layerName.includes('Canopy') || layerName.includes('CHM'))
			return { title: 'Canopy Height', unit: 'm' };
		if (layerName.includes('ML') || layerName.includes('Prediction'))
			return { title: 'Detection Score', unit: '' };
		if (layerName.includes('Atmospheric'))
			return { title: 'Atmospheric Index', unit: '' };
		if (layerName.includes('RGB'))
			return { title: 'Reflectance', unit: '' };
		return { title: layerName, unit: '' };
	}

	if (layerMetadata?.indicator) return { title: layerMetadata.indicator, unit: '' };
	if (layerMetadata?.definition) return { title: layerMetadata.definition, unit: '' };
	if (layerName.includes('Pr')) return { title: 'Prevalence', unit: '%' };
	if (layerName.includes('SE')) return { title: 'Standard Error', unit: '' };

	return { title: layerName, unit: '' };
}

export function formatTickValue(value: number, min: number, max: number, unit: string): string {
	const range = max - min;
	let formatted: string;
	if (range < 1) {
		formatted = value.toFixed(2);
	} else if (range < 10) {
		formatted = value.toFixed(1);
	} else {
		formatted = Math.round(value).toString();
	}
	return unit ? `${formatted}${unit}` : formatted;
}

export function computeTicks(min: number, max: number, steps: number = 4): number[] {
	const ticks: number[] = [];
	const span = max - min || 1;
	const step = span / steps;
	for (let i = 0; i <= steps; i++) {
		ticks.push(min + step * i);
	}
	return ticks;
}
