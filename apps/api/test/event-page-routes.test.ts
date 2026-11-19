/**
 * Rotas da página exclusiva do evento. Exercitam a rota real com o Supabase
 * substituído na borda: sessão, validação do layout e posse do evento.
 */
import { describe, expect, it } from 'vitest';
import { buildDefaultEventPageLayout } from '@events-manager/contracts';
import { eventPageRoutes } from '../src/routes/event-pages.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	sessionCookie,
	TEST_EVENT_ID,
	TEST_ORGANIZER_ID,
	TEST_USER_ID,
} from './support/index.js';

const event = {
	id: TEST_EVENT_ID,
	title: 'Congresso',
	description: '<p>Três dias.</p>',
	organizer_id: { id: TEST_ORGANIZER_ID },
	start_date: '2026-09-19T12:00:00.000Z',
};

const storedPage = {
	event_id: TEST_EVENT_ID,
	enabled: false,
	draft: buildDefaultEventPageLayout(event),
	published: null,
	published_at: null,
	date_updated: '2026-09-17T12:00:00.000Z',
};

/** `event_pages` é lida em ordem: a leitura pode não achar nada; a gravação devolve a linha. */
function buildApp(options: { user?: boolean; owned?: boolean; saving?: boolean } = {}) {
	const { user = true, owned = true, saving = false } = options;
	const { clients } = createSupabaseClientsStub({
		user: user ? { id: TEST_USER_ID, email: 'org@events.local' } : null,
		tables: {
			profiles: { data: { id: TEST_USER_ID, email: 'org@events.local', role: 'organizer', status: 'active' } },
			organizers: { data: owned ? { id: TEST_ORGANIZER_ID, user_id: TEST_USER_ID, status: 'active' } : null },
			events: { data: owned ? event : null },
			event_pages: saving ? { data: storedPage } : [{ data: null }, { data: storedPage }],
		},
	});

	return buildRouteTestApp(eventPageRoutes, { clients });
}

describe('GET /api/events/:id/page', () => {
	it('requires a session', async () => {
		const app = await buildApp({ user: false });

		const response = await app.inject({ method: 'GET', url: `/api/events/${TEST_EVENT_ID}/page` });

		expect(response.statusCode).toBe(401);
	});

	it('answers 404 for an event the person does not own', async () => {
		const app = await buildApp({ owned: false });

		const response = await app.inject({
			method: 'GET',
			url: `/api/events/${TEST_EVENT_ID}/page`,
			headers: sessionCookie(),
		});

		expect(response.statusCode).toBe(404);
	});

	it('returns the draft, built from the event when nothing was saved yet', async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: 'GET',
			url: `/api/events/${TEST_EVENT_ID}/page`,
			headers: sessionCookie(),
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().draft.sections.map((section: { type: string }) => section.type)).toEqual([
			'hero',
			'about',
			'tickets',
		]);
	});
});

describe('PUT /api/events/:id/page', () => {
	it('validates the layout against the shared contract', async () => {
		const app = await buildApp();

		const response = await app.inject({
			method: 'PUT',
			url: `/api/events/${TEST_EVENT_ID}/page`,
			headers: sessionCookie(),
			payload: { draft: { version: 1, header: { nav: [{ label: 'Blog', anchor: '/blog' }] }, sections: [] } },
		});

		expect(response.statusCode).toBe(422);
	});

	it('saves a valid draft', async () => {
		const app = await buildApp({ saving: true });

		const response = await app.inject({
			method: 'PUT',
			url: `/api/events/${TEST_EVENT_ID}/page`,
			headers: sessionCookie(),
			payload: { draft: buildDefaultEventPageLayout(event) },
		});

		expect(response.statusCode).toBe(200);
		expect(response.json().draft.sections).toHaveLength(3);
	});
});

describe('POST /api/events/:id/page/unpublish', () => {
	it('returns to the standard layout without losing the draft', async () => {
		const app = await buildApp({ saving: true });
		const response = await app.inject({
			method: 'POST',
			url: `/api/events/${TEST_EVENT_ID}/page/unpublish`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ enabled: false, draft: JSON.parse(JSON.stringify(storedPage.draft)) });
	});
	it('is safe to repeat when the page was never saved', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: `/api/events/${TEST_EVENT_ID}/page/unpublish`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(200);
		expect(response.json().enabled).toBe(false);
		expect(response.json().draft.sections.map((section: { type: string }) => section.type)).toEqual([
			'hero',
			'about',
			'tickets',
		]);
	});
	it.each([
		{ user: false, status: 401 },
		{ owned: false, status: 404 },
	])('protects the event from unauthorized changes ($status)', async ({ status, ...options }) => {
		const app = await buildApp(options);
		const response = await app.inject({
			method: 'POST',
			url: `/api/events/${TEST_EVENT_ID}/page/unpublish`,
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(status);
	});
	it('validates the event identifier', async () => {
		const app = await buildApp();
		const response = await app.inject({
			method: 'POST',
			url: '/api/events/invalid/page/unpublish',
			headers: sessionCookie(),
		});
		await app.close();
		expect(response.statusCode).toBe(422);
	});
});
