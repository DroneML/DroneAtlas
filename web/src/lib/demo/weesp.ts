import { base } from '$app/paths';

export const WEESP_DEMO_CENTER: [number, number] = [5.077141071509097, 52.29145220918268];

const WEESP_IMAGE_CENTER: [number, number] = [
	WEESP_DEMO_CENTER[0] - 0.00002,
	WEESP_DEMO_CENTER[1] - 0.00008
];
const WEESP_IMAGE_HALF_LNG = 0.00135;
const WEESP_IMAGE_HALF_LAT = 0.000825;

export const WEESP_IMAGE_BOUNDS: [number, number, number, number] = [
	WEESP_IMAGE_CENTER[0] - WEESP_IMAGE_HALF_LNG,
	WEESP_IMAGE_CENTER[1] - WEESP_IMAGE_HALF_LAT,
	WEESP_IMAGE_CENTER[0] + WEESP_IMAGE_HALF_LNG,
	WEESP_IMAGE_CENTER[1] + WEESP_IMAGE_HALF_LAT
];

const WEESP_SITE_UV_CENTER: [number, number] = [0.56, 0.515];
const WEESP_SITE_ROTATION_DEG = -20;

function rotateWeespUv(u: number, v: number, degrees: number): [number, number] {
	const radians = (degrees * Math.PI) / 180;
	const cos = Math.cos(radians);
	const sin = Math.sin(radians);
	const du = u - WEESP_SITE_UV_CENTER[0];
	const dv = v - WEESP_SITE_UV_CENTER[1];
	return [
		WEESP_SITE_UV_CENTER[0] + du * cos - dv * sin,
		WEESP_SITE_UV_CENTER[1] + du * sin + dv * cos
	];
}

export function weespSiteUvToImageUv(u: number, v: number): [number, number] {
	return rotateWeespUv(u, v, WEESP_SITE_ROTATION_DEG);
}

export function weespImageUvToSiteUv(u: number, v: number): [number, number] {
	return rotateWeespUv(u, v, -WEESP_SITE_ROTATION_DEG);
}

const weespImageBase = `${base}/weesp_images`;

export const WEESP_IMAGE_URLS = {
	rgb: `${weespImageBase}/rgb.png`,
	lidar: `${weespImageBase}/lidar.png`,
	multispectral: `${weespImageBase}/multispectral.png`,
	thermal: `${weespImageBase}/termal.png`
};
