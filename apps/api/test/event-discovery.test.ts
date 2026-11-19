import { describe, expect, it, vi } from 'vitest';
import { eventRoutes } from '../src/routes/events.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	fakeQueryBuilder,
	TEST_EVENT_ID,
	TEST_ORGANIZER_ID,
} from './support/index.js';

// O filtro deve chegar ao banco antes da paginação, inclusive com o catálogo cheio.
describe('public events from the same organizer', () => {
	it('restricts discovery to published, public, upcoming events from the organization and excludes the current event', async () => {
		const { clients, from } = createSupabaseClientsStub();
		const builder = fakeQueryBuilder({ data: [{ id: 'other', title: 'Outro encontro' }], count: 1 });
		const eq = vi.fn(() => builder);
		const neq = vi.fn(() => builder);
		const gte = vi.fn(() => builder);
		const observed = new Proxy(builder, {
			get(target, key) {
				return key === 'eq' ? eq : key === 'neq' ? neq : key === 'gte' ? gte : Reflect.get(target, key);
			},
		});
		// Cada encadeamento volta ao builder observado.
		eq.mockImplementation(() => observed);
		neq.mockImplementation(() => observed);
		gte.mockImplementation(() => observed);
		from.mockImplementation(
			() =>
				new Proxy(observed, {
					get(target, key) {
						if (key === 'select') return () => observed;
						return Reflect.get(target, key);
					},
				}),
		);
		const app = await buildRouteTestApp(eventRoutes, { clients });
		const response = await app.inject({
			method: 'GET',
			url: `/api/events/public?organizer_id=${TEST_ORGANIZER_ID}&exclude_id=${TEST_EVENT_ID}&limit=4`,
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(eq).toHaveBeenCalledWith('organizer_id', TEST_ORGANIZER_ID);
		expect(eq).toHaveBeenCalledWith('status', 'published');
		expect(eq).toHaveBeenCalledWith('visibility', 'public');
		expect(neq).toHaveBeenCalledWith('id', TEST_EVENT_ID);
		expect(gte).toHaveBeenCalledWith('end_date', expect.any(String));
		expect(response.json().data).toEqual([{ id: 'other', title: 'Outro encontro' }]);
	});

	it.each(['organizer_id=invalid', 'exclude_id=invalid'])('validates the discovery filter %s', async (query) => {
		const { clients } = createSupabaseClientsStub();
		const app = await buildRouteTestApp(eventRoutes, { clients });
		const response = await app.inject({ method: 'GET', url: `/api/events/public?${query}` });
		await app.close();
		expect(response.statusCode).toBe(422);
	});
});
