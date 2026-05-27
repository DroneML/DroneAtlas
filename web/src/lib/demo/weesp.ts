import { base } from '$app/paths';

export const WEESP_DEMO_CENTER: [number, number] = [5.077141071509097, 52.29145220918268];

const WEESP_IMAGE_HALF_LNG = 0.00135;
const WEESP_IMAGE_HALF_LAT = 0.000825;

export const WEESP_IMAGE_BOUNDS: [number, number, number, number] = [
	WEESP_DEMO_CENTER[0] - WEESP_IMAGE_HALF_LNG,
	WEESP_DEMO_CENTER[1] - WEESP_IMAGE_HALF_LAT,
	WEESP_DEMO_CENTER[0] + WEESP_IMAGE_HALF_LNG,
	WEESP_DEMO_CENTER[1] + WEESP_IMAGE_HALF_LAT
];

const weespImageBase = `${base}/weesp_images`;

export const WEESP_IMAGE_URLS = {
	rgb: `${weespImageBase}/rgb.png`,
	lidar: `${weespImageBase}/lidar.png`,
	multispectral: `${weespImageBase}/multispectral.png`,
	thermal: `${weespImageBase}/termal.png`
};
