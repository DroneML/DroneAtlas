export function isProbabilityLayerName(name: string | null): boolean {
	return Boolean(name?.toLowerCase().includes('probability'));
}

export function formatHoverRasterValue(value: number, name: string | null): string {
	if (isProbabilityLayerName(name)) return `${Math.round(value)}%`;
	return String(value);
}
