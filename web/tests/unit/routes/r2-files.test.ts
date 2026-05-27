import { afterEach, describe, expect, mock, test } from 'bun:test';
import { GET } from '../../../src/routes/api/r2-files/+server';

const originalFetch = global.fetch;

async function readJson(response: Response) {
	return response.json() as Promise<Record<string, unknown>>;
}

describe('/api/r2-files', () => {
	afterEach(() => {
		global.fetch = originalFetch;
	});

	test('returns a manifest when the R2 manifest is reachable', async () => {
		const manifest = {
			files: [{ date: '2026-01-02', fileName: 'file.csv', url: 'https://example.test/file.csv' }],
			source: 'manifest'
		};
		global.fetch = mock(async () => Response.json(manifest)) as unknown as typeof fetch;

		const response = await GET({} as never);
		const body = await readJson(response);

		expect(response.status).toBe(200);
		expect(body).toEqual(manifest);
		expect(global.fetch).toHaveBeenCalledTimes(1);
	});

	test('falls back to detected files when manifest is unavailable', async () => {
		const existingDates = new Set(['2026-05-27', '2026-05-25', '2026-05-24']);
		global.fetch = mock(async (url: string | URL | Request, init?: RequestInit) => {
			if (!init?.method) return new Response('missing', { status: 404 });
			const match = String(url).match(/(\d{4}-\d{2}-\d{2})_Plan-EO_Dashboard_point_data\.csv$/);
			return new Response(null, { status: match && existingDates.has(match[1]) ? 200 : 404 });
		}) as unknown as typeof fetch;

		const response = await GET({} as never);
		const body = await readJson(response) as { files: Array<{ date: string; fileName: string }>; source: string };

		expect(response.status).toBe(200);
		expect(body.source).toBe('detected');
		expect(body.files).toHaveLength(3);
		expect(body.files.map((file) => file.date)).toEqual(['2026-05-27', '2026-05-25', '2026-05-24']);
		expect(response.headers.get('cache-control')).toContain('no-cache');
	});

	test('returns default file metadata when no recent R2 files are detected', async () => {
		global.fetch = mock(async () => new Response('missing', { status: 404 })) as unknown as typeof fetch;

		const response = await GET({} as never);
		const body = await readJson(response) as { files: Array<{ date: string; fileName: string }>; source: string };

		expect(response.status).toBe(200);
		expect(body.source).toBe('default');
		expect(body.files[0]).toMatchObject({
			date: '2025-08-25',
			fileName: '2025-08-25_Plan-EO_Dashboard_point_data.csv'
		});
	});
});
