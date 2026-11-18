import { afterEach, describe, expect, it, vi } from 'vitest';
import { externalRoutes } from '../src/routes/external.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';
async function setup(authenticated = true) {
	const stub = createSupabaseClientsStub({
		user: authenticated ? { id: TEST_USER_ID, email: 'owner@example.test' } : null,
		tables: { profiles: { data: { status: 'active', role: 'organizer' } } },
	});
	return buildRouteTestApp(externalRoutes, { clients: stub.clients, env: createTestEnv() });
}
afterEach(() => vi.unstubAllGlobals());
describe('consulta de CEP pelo ViaCEP', () => {
	it('retorna os campos do endereço e preserva o CEP normalizado', async () => {
		const fetch = vi.fn().mockResolvedValue(
			new Response(
				JSON.stringify({
					cep: '01001-000',
					logradouro: 'Praça da Sé',
					bairro: 'Sé',
					localidade: 'São Paulo',
					uf: 'SP',
					complemento: 'lado ímpar',
				}),
			),
		);
		vi.stubGlobal('fetch', fetch);
		const app = await setup();
		const r = await app.inject({ method: 'GET', url: '/api/places/postal-code/01001000', headers: sessionCookie() });
		expect(r.statusCode).toBe(200);
		expect(r.json()).toMatchObject({
			postal_code: '01001000',
			street: 'Praça da Sé',
			neighborhood: 'Sé',
			city: 'São Paulo',
			state: 'SP',
		});
		expect(fetch).toHaveBeenCalledWith('https://viacep.com.br/ws/01001000/json/', expect.any(Object));
	});
	it('valida o CEP antes de consultar o serviço externo', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		const app = await setup();
		expect(
			(await app.inject({ method: 'GET', url: '/api/places/postal-code/123', headers: sessionCookie() })).statusCode,
		).toBe(422);
		expect(fetch).not.toHaveBeenCalled();
	});
	it('exige autenticação', async () => {
		const app = await setup(false);
		expect((await app.inject({ method: 'GET', url: '/api/places/postal-code/01001000' })).statusCode).toBe(401);
	});
	it('explica quando o CEP não foi encontrado', async () => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ erro: true }))));
		const app = await setup();
		expect(
			(await app.inject({ method: 'GET', url: '/api/places/postal-code/99999999', headers: sessionCookie() }))
				.statusCode,
		).toBe(404);
	});
	it('permite preenchimento manual quando o serviço externo falha', async () => {
		vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
		const app = await setup();
		const r = await app.inject({ method: 'GET', url: '/api/places/postal-code/01001000', headers: sessionCookie() });
		expect(r.statusCode).toBe(503);
		expect(r.json().detail).toContain('manualmente');
	});
});
