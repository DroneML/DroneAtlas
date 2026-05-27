/**
 * Global test setup for Bun test runner
 * This file is executed before any tests run
 */

import { beforeAll, afterAll, mock } from 'bun:test';
import { writable } from 'svelte/store';
import { setupBrowserMocks, cleanupBrowserMocks } from '../helpers/mocks/browser';
import { setupGeoTIFFMocks, cleanupGeoTIFFMocks } from '../helpers/mocks/geotiff';

const page = writable({
	url: new URL('https://example.test/'),
	params: {},
	route: { id: null },
	status: 200,
	error: null,
	data: {},
	form: undefined
});

mock.module('$app/environment', () => ({
	browser: false,
	dev: false,
	building: false,
	version: 'test'
}));

mock.module('$app/paths', () => ({
	base: '',
	assets: ''
}));

mock.module('$app/stores', () => ({
	page,
	navigating: writable(null),
	updated: { subscribe: writable(false).subscribe, check: async () => false }
}));

mock.module('$app/navigation', () => ({
	goto: mock(async () => {}),
	invalidate: mock(async () => {}),
	invalidateAll: mock(async () => {}),
	preloadData: mock(async () => ({ type: 'loaded' })),
	preloadCode: mock(async () => {}),
	beforeNavigate: mock(() => {}),
	afterNavigate: mock(() => {}),
	disableScrollHandling: mock(() => {}),
	pushState: mock(() => {}),
	replaceState: mock(() => {})
}));

mock.module('svelte-french-toast', () => ({
	default: {
		success: mock(() => {}),
		error: mock(() => {})
	}
}));

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_MAPTILER_KEY = 'test_maptiler_key';
process.env.VITE_R2_BUCKET_URL = 'https://test.r2.dev';
process.env.BASE_PATH = '';

// Mock $app/environment for SvelteKit
// @ts-ignore
global.$app = {
	environment: {
		browser: false,
		dev: false,
		building: false,
		version: 'test'
	}
};

// Global setup
beforeAll(() => {
	console.log('🧪 Running test suite...');
	setupBrowserMocks();
	setupGeoTIFFMocks();
});

// Global teardown
afterAll(() => {
	cleanupBrowserMocks();
	cleanupGeoTIFFMocks();
	console.log('✅ Test suite completed');
});
