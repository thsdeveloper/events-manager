import { afterEach, describe, expect, it, vi } from 'vitest';
import { externalRoutes } from '../src/routes/external.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const categoryId = '00000000-0000-4000-8000-000000000050';
const input = {
	title: 'Encontro de inovação',
	categoryId,
	description: 'Oficinas de robótica',
	short_description: 'Encontro anual',
	tags: ['robótica'],
	event_type: 'online',
};
afterEach(() => vi.unstubAllGlobals());

async function setup({ authenticated = true, organizer = true, allowed = true, configured = true } = {}) {
	const network = vi.fn(
		async (url: unknown) =>
			new Response(
				JSON.stringify(
					String(url).includes('/images/')
						? { data: [{ b64_json: Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString('base64') }] }
						: {
								object: 'response',
								id: 'response',
								status: 'completed',
								output: [
									{
										type: 'message',
										role: 'assistant',
										content: [
											{
												type: 'output_text',
												text: 'Participe do encontro de inovação.\n\nExplore oficinas de robótica.',
												annotations: [],
											},
										],
									},
								],
							},
				),
				{ headers: { 'content-type': 'application/json' } },
			),
	);
	vi.stubGlobal('fetch', network);
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'ana@example.test' } : null,
		rpc: { data: allowed },
		tables: {
			profiles: { data: { id: TEST_USER_ID, role: 'organizer', status: 'active' } },
			organizers: { data: organizer ? [{ id: 'org', user_id: TEST_USER_ID, status: 'active' }] : [] },
			event_categories: { data: { name: 'Tecnologia', description: 'Inovação' } },
			media_files: { data: { id: 'cover', filename: 'cover.jpg' } },
		},
	});
	const app = await buildRouteTestApp(externalRoutes, {
		clients: stub.clients,
		env: createTestEnv({ OPENAI_API_KEY: configured ? 'test-key' : undefined }),
	});
	return { app, network, ...stub };
}

describe.each(['generate-cover', 'generate-description'])('event AI /%s', (action) => {
	it.each([
		{ authenticated: false, organizer: true, status: 401 },
		{ authenticated: true, organizer: false, status: 403 },
	])('requires an organizer ($status)', async ({ status, ...options }) => {
		const { app, network } = await setup(options);
		const response = await app.inject({
			method: 'POST',
			url: '/api/ai/' + action,
			headers: sessionCookie(),
			payload: input,
		});
		await app.close();
		expect(response.statusCode).toBe(status);
		expect(network).not.toHaveBeenCalled();
	});
	it('rejects missing categories and oversized context before contacting the provider', async () => {
		const { app, network } = await setup();
		for (const payload of [
			{ ...input, categoryId: undefined },
			{ ...input, title: 'x'.repeat(101) },
		]) {
			const response = await app.inject({
				method: 'POST',
				url: '/api/ai/' + action,
				headers: sessionCookie(),
				payload,
			});
			expect(response.statusCode).toBe(422);
		}
		await app.close();
		expect(network).not.toHaveBeenCalled();
	});
	it('limits paid requests per organizer', async () => {
		const { app, network } = await setup({ allowed: false });
		const response = await app.inject({
			method: 'POST',
			url: '/api/ai/' + action,
			headers: sessionCookie(),
			payload: input,
		});
		await app.close();
		expect(response.statusCode).toBe(429);
		expect(network).not.toHaveBeenCalled();
	});
	it('reports missing configuration without a provider call', async () => {
		const { app, network } = await setup({ configured: false });
		const response = await app.inject({
			method: 'POST',
			url: '/api/ai/' + action,
			headers: sessionCookie(),
			payload: input,
		});
		await app.close();
		expect(response.statusCode).toBe(503);
		expect(network).not.toHaveBeenCalled();
	});
	it('generates from the complete event context with a bounded economical request', async () => {
		const { app, network, storageBucket } = await setup();
		const response = await app.inject({
			method: 'POST',
			url: '/api/ai/' + action,
			headers: sessionCookie(),
			payload: input,
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(network).toHaveBeenCalledOnce();
		const request = JSON.parse(String((network.mock.calls[0] as unknown as [unknown, RequestInit])[1].body));
		expect(JSON.stringify(request)).toContain('Oficinas de robótica');
		if (action === 'generate-cover') {
			expect(request).toMatchObject({
				model: 'gpt-image-2.6-flare',
				quality: 'low',
				complexity: 'low',
				n: 1,
				size: '1536x864',
				output_format: 'jpeg',
			});
			expect(response.json()).toMatchObject({ fileId: 'cover' });
			expect(storageBucket.upload).toHaveBeenCalledOnce();
		} else {
			expect(request).toMatchObject({ model: 'gpt-6-luna', max_output_tokens: 1000, reasoning: { effort: 'none' } });
			expect(response.json()).toEqual({
				description: 'Participe do encontro de inovação.\n\nExplore oficinas de robótica.',
			});
			expect(storageBucket.upload).not.toHaveBeenCalled();
		}
	});
	it('does not retry a failed paid generation or leak provider diagnostics', async () => {
		const { app, network } = await setup();
		network.mockImplementation(
			async () =>
				new Response(JSON.stringify({ error: { message: 'private provider diagnostic' } }), {
					status: 500,
					headers: { 'content-type': 'application/json' },
				}),
		);
		const response = await app.inject({
			method: 'POST',
			url: '/api/ai/' + action,
			headers: sessionCookie(),
			payload: input,
		});
		await app.close();
		expect(response.statusCode).toBe(502);
		expect(response.body).not.toContain('private provider diagnostic');
		expect(network).toHaveBeenCalledOnce();
	});
});
