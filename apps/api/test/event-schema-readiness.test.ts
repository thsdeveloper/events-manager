import { describe, expect, it } from 'vitest';
import { eventRoutes } from '../src/routes/events.js';
import { buildRouteTestApp } from './support/index.js';
import { eventMemory } from './support/event-memory.js';
describe('event schema readiness errors', () => {
	it.each([
		{ code: 'PGRST204', message: "Could not find the 'visibility' column of 'events' in the schema cache" },
		{ code: '42703', message: 'column events.description_en does not exist' },
		{ code: 'PGRST205', message: "Could not find the table 'public.event_drafts' in the schema cache" },
	])('explains an expected migration gap (%o)', async (error) => {
		const memory = eventMemory();
		const app = await buildRouteTestApp(
			async (app, options) => {
				await app.register(eventRoutes, options);
				app.get('/test-schema-error', () => {
					throw error;
				});
			},
			{ clients: memory.clients },
		);
		const response = await app.inject({ method: 'GET', url: '/test-schema-error' });
		await app.close();
		expect(response.statusCode).toBe(503);
		expect(response.json().title).toBe('DATABASE_MIGRATION_REQUIRED');
		expect(response.json().detail).toMatch(/atualiza|migra/i);
		expect(response.json()).not.toHaveProperty('context');
	});
	it.each([
		{ code: '42703', message: 'column events.some_unknown_typo does not exist' },
		{ code: 'PGRST204', message: "Could not find the 'unrelated' column of 'profiles' in the schema cache" },
		{ message: 'fetch failed' },
	])('does not blame migrations for unexpected failures (%o)', async (error) => {
		const memory = eventMemory();
		const app = await buildRouteTestApp(
			async (app, options) => {
				await app.register(eventRoutes, options);
				app.get('/test-schema-error', () => {
					throw error;
				});
			},
			{ clients: memory.clients },
		);
		const response = await app.inject({ method: 'GET', url: '/test-schema-error' });
		await app.close();
		expect(response.statusCode).toBe(500);
		expect(response.json().title).toBe('INTERNAL_ERROR');
	});
});
