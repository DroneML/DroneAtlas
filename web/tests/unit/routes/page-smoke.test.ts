import { describe, expect, test } from 'bun:test';
import { prerender as rootPrerender, ssr as rootSsr } from '../../../src/routes/+layout';
import { prerender as demoPrerender, ssr as demoSsr } from '../../../src/routes/demo/+page';

const routeFiles = {
	root: new URL('../../../src/routes/+page.svelte', import.meta.url),
	about: new URL('../../../src/routes/about/+page.svelte', import.meta.url),
	demo: new URL('../../../src/routes/demo/+page.svelte', import.meta.url),
	layout: new URL('../../../src/routes/+layout.svelte', import.meta.url)
};

async function source(file: URL) {
	return Bun.file(file).text();
}

describe('route smoke tests', () => {
	test('uses static root layout with client-only rendering', () => {
		expect(rootPrerender).toBe(true);
		expect(rootSsr).toBe(false);
	});

	test('keeps the interactive demo route client-rendered and non-prerendered', () => {
		expect(demoPrerender).toBe(false);
		expect(demoSsr).toBe(false);
	});

	test('root page mounts the map with the Weesp demo defaults', async () => {
		const text = await source(routeFiles.root);

		expect(text).toContain('DroneAtlas - Spatial Intelligence');
		expect(text).toContain('Map initialCenter={WEESP_DEMO_CENTER}');
		expect(text).toContain('initialStyleId="hybrid"');
	});

	test('about page includes durable project identity and external references', async () => {
		const text = await source(routeFiles.about);

		expect(text).toContain('About DroneATLAS');
		expect(text).toContain('Netherlands eScience Center');
		expect(text).toContain('University of Amsterdam');
		expect(text).toContain('https://github.com/DroneML/DroneAtlas');
	});

	test('demo page wires the presentation timeline and map dependencies', async () => {
		const text = await source(routeFiles.demo);

		expect(text).toContain('createTimeline');
		expect(text).toContain('buildBeats');
		expect(text).toContain('generateFlightPath');
		expect(text).toContain('WEESP_DEMO_CENTER');
	});

	test('shared layout renders persistent navigation and toast surfaces', async () => {
		const text = await source(routeFiles.layout);

		expect(text).toContain('Header');
		expect(text).toContain('SideMenu');
		expect(text).toContain('GlobalToast');
		expect(text).toContain('{@render children()}');
	});
});
