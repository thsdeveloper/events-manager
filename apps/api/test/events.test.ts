/**
 * Exemplo de referência do ciclo TDD na API.
 *
 * Cada bloco `it` foi escrito antes do comportamento que descreve e nomeia a
 * regra de negócio, não a implementação. Os casos de uso recebem dublês das
 * portas (repositórios); a rota é exercitada com `app.inject` e um Supabase
 * falso, sem abrir porta nem rede.
 */
import { describe, expect, it, vi } from 'vitest';
import {
	EventNotFound,
	EventService,
	OrganizerRequired,
	type EventRepository,
	type EventTicketCreator,
} from '../src/application/events/event-service.js';
import { eventRoutes } from '../src/routes/events.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	partialMock,
	sessionCookie,
	TEST_EVENT_ID,
	TEST_USER_ID,
} from './support/index.js';

const publishedEvent = {
	id: TEST_EVENT_ID,
	organizer_id: '00000000-0000-4000-8000-000000000002',
	slug: 'conferencia',
	status: 'published',
	tickets: [
		{ id: 't-2', sort: 2 },
		{ id: 't-0', sort: 0 },
		{ id: 't-1', sort: 1 },
	],
};

describe('EventService', () => {
	describe('getPublicBySlug', () => {
		it('returns the event with tickets ordered by their sort position', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				findPublicBySlug: vi.fn().mockResolvedValue(structuredClone(publishedEvent)),
			});

			const event = await new EventService(repository).getPublicBySlug('conferencia');

			expect((event.tickets as Array<{ id: string }>).map((ticket) => ticket.id)).toEqual(['t-0', 't-1', 't-2']);
		});

		it('exposes the organizer\u2019s published page only while it is enabled, never the draft', async () => {
			const layout = { version: 1, header: { nav: [] }, sections: [] };
			const withPage = { ...publishedEvent, page: { enabled: true, published: layout, draft: { version: 1 } } };
			const disabled = { ...publishedEvent, page: { enabled: false, published: layout, draft: { version: 1 } } };
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				findPublicBySlug: vi
					.fn()
					.mockResolvedValueOnce(structuredClone(withPage))
					.mockResolvedValueOnce(structuredClone(disabled))
					.mockResolvedValueOnce(structuredClone(publishedEvent)),
			});
			const service = new EventService(repository);

			expect((await service.getPublicBySlug('conferencia')).page).toEqual(layout);
			expect((await service.getPublicBySlug('conferencia')).page).toBeNull();
			expect((await service.getPublicBySlug('conferencia')).page).toBeNull();
		});

		it('signals a missing event with a domain error instead of returning null', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				findPublicBySlug: vi.fn().mockResolvedValue(null),
			});

			await expect(new EventService(repository).getPublicBySlug('inexistente')).rejects.toBeInstanceOf(EventNotFound);
		});
	});

	describe('listPublic', () => {
		it('derives pagination metadata from the repository total', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				listPublic: vi.fn().mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }], total: 25 }),
			});

			const result = await new EventService(repository).listPublic({ limit: 12, page: 2, search: '' });

			expect(result.pagination).toEqual({ limit: 12, page: 2, pageCount: 3, total: 25 });
			expect(repository.listPublic).toHaveBeenCalledWith({ limit: 12, page: 2, search: '' });
		});
	});

	describe('listCategories', () => {
		it('lists the catalog in the order the super admin arranged it', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				listCategories: vi.fn().mockResolvedValue([
					{ id: 'musica', name: 'Música', sort: 2 },
					{ id: 'tecnologia', name: 'Tecnologia', sort: 1 },
				]),
			});

			const categories = await new EventService(repository).listCategories();

			expect((categories as Array<{ id: string }>).map((category) => category.id)).toEqual(['tecnologia', 'musica']);
		});

		it('pushes categories without a position to the end, in alphabetical order', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				listCategories: vi.fn().mockResolvedValue([
					{ id: 'teatro', name: 'Teatro', sort: null },
					{ id: 'arte', name: 'Arte', sort: null },
					{ id: 'tecnologia', name: 'Tecnologia', sort: 1 },
				]),
			});

			const categories = await new EventService(repository).listCategories();

			expect((categories as Array<{ id: string }>).map((category) => category.id)).toEqual([
				'tecnologia',
				'arte',
				'teatro',
			]);
		});
	});

	describe('update', () => {
		// Como o repositório devolve o evento ao organizador: relações embutidas
		// como objetos, não como ids.
		const storedDraft = {
			registration_start: null,
			registration_end: null,
			id: TEST_EVENT_ID,
			title: 'Congresso',
			slug: 'congresso',
			status: 'draft',
			start_date: '2026-09-19T12:00:00.000Z',
			end_date: '2026-09-21T21:00:00.000Z',
			category_id: { id: '00000000-0000-4000-8000-000000000050', name: 'Religioso', slug: 'religioso' },
			organizer_id: { id: '00000000-0000-4000-8000-000000000002', name: 'ADEB' },
			cover_image: { id: '00000000-0000-4000-8000-000000000051', bucket: 'media', path: 'capa.png' },
			tickets: [],
			registrations: [],
		};

		it('publishes a draft whose category and cover are stored as relations, validating them by id', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				findForUser: vi.fn().mockResolvedValue(storedDraft),
				updateForUser: vi.fn().mockResolvedValue({ ...storedDraft, status: 'published' }),
			});

			const event = await new EventService(repository).update(TEST_USER_ID, TEST_EVENT_ID, { status: 'published' });

			expect(event).toMatchObject({ status: 'published' });
			expect(repository.updateForUser).toHaveBeenCalledWith(TEST_USER_ID, TEST_EVENT_ID, { status: 'published' });
		});

		it('sanitizes the description HTML before storing it, keeping formatting and links', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				findForUser: vi.fn().mockResolvedValue(storedDraft),
				updateForUser: vi.fn().mockResolvedValue(storedDraft),
			});

			await new EventService(repository).update(TEST_USER_ID, TEST_EVENT_ID, {
				description: '<p><strong>Oi</strong> <a href="https://x.dev">site</a><script>alert(1)</script></p>',
			});

			const [, , patch] = (repository.updateForUser as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(patch.description).toContain('<strong>Oi</strong>');
			expect(patch.description).toContain('href="https://x.dev"');
			expect(patch.description).not.toContain('<script');
		});

		it('still refuses a patch that breaks the event rules against the stored data', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				findForUser: vi.fn().mockResolvedValue(storedDraft),
				updateForUser: vi.fn(),
			});

			await expect(
				new EventService(repository).update(TEST_USER_ID, TEST_EVENT_ID, { end_date: '2026-09-01T00:00:00.000Z' }),
			).rejects.toThrow();
			expect(repository.updateForUser).not.toHaveBeenCalled();
		});
	});

	describe('create', () => {
		const eventInput = { title: 'Evento' };

		it('sanitizes the description HTML of a new event', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				createForUser: vi.fn().mockResolvedValue(publishedEvent),
			});

			await new EventService(repository).create(TEST_USER_ID, {
				...eventInput,
				description: '<p>Oi<img src=x onerror="alert(1)"></p>',
				tickets: [],
			} as never);

			const [, input] = (repository.createForUser as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(input.description).not.toContain('onerror');
		});

		it('requires an active organizer profile', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				createForUser: vi.fn().mockResolvedValue('organizer_required'),
			});

			await expect(
				new EventService(repository).create(TEST_USER_ID, { ...eventInput, tickets: [] } as never),
			).rejects.toBeInstanceOf(OrganizerRequired);
		});

		it('rolls the event back when one of its tickets cannot be created', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				createForUser: vi.fn().mockResolvedValue(publishedEvent),
				deleteForUser: vi.fn().mockResolvedValue(true),
			});
			const tickets: EventTicketCreator = { create: vi.fn().mockRejectedValue(new Error('ticket invalid')) };
			const service = new EventService(repository, tickets);

			await expect(
				service.create(TEST_USER_ID, { ...eventInput, tickets: [{ name: 'Lote 1' }] } as never),
			).rejects.toThrow('ticket invalid');

			expect(repository.deleteForUser).toHaveBeenCalledWith(TEST_USER_ID, TEST_EVENT_ID);
		});

		it('creates each ticket against the organizer that owns the event', async () => {
			const repository = partialMock<EventRepository>({
				canPublishForUser: vi.fn().mockResolvedValue(true),
				createForUser: vi.fn().mockResolvedValue(publishedEvent),
			});
			const tickets: EventTicketCreator = { create: vi.fn().mockResolvedValue({}) };

			await new EventService(repository, tickets).create(TEST_USER_ID, {
				...eventInput,
				tickets: [{ name: 'Lote 1' }, { name: 'Lote 2' }],
			} as never);

			expect(tickets.create).toHaveBeenCalledTimes(2);
			expect(tickets.create).toHaveBeenCalledWith(
				publishedEvent.organizer_id,
				expect.objectContaining({ name: 'Lote 1', event_id: TEST_EVENT_ID }),
			);
		});
	});
});

describe('event routes', () => {
	it('creates an event using a category returned by the seeded catalog', async () => {
		const category_id = '50000000-0000-0000-0000-000000000001';
		const organizer_id = '00000000-0000-4000-8000-000000000002';
		const input = {
			title: 'Encontro de tecnologia',
			slug: 'encontro-de-tecnologia',
			category_id,
			is_free: true,
			start_date: '2027-01-10T18:00:00Z',
			end_date: '2027-01-10T21:00:00Z',
			status: 'draft',
		};
		const { clients } = createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: 'organizer@example.test' },
			tables: {
				organizers: { data: [{ id: organizer_id, user_id: TEST_USER_ID, status: 'active' }] },
				events: { data: { ...input, id: TEST_EVENT_ID, organizer_id } },
			},
		});
		const app = await buildRouteTestApp(eventRoutes, { clients });
		const response = await app.inject({ method: 'POST', url: '/api/events', headers: sessionCookie(), payload: input });
		await app.close();
		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ id: TEST_EVENT_ID, category_id });
	});

	it('rejects a public listing above the page size limit with a validation problem', async () => {
		const { clients } = createSupabaseClientsStub();
		const app = await buildRouteTestApp(eventRoutes, { clients });

		const response = await app.inject({ method: 'GET', url: '/api/events/public?limit=100' });
		await app.close();

		expect(response.statusCode).toBe(422);
		expect(response.headers['content-type']).toContain('application/problem+json');
		expect(response.json()).toMatchObject({ status: 422, title: 'VALIDATION_ERROR' });
	});

	it('maps an unknown slug to a 404 problem with a stable code', async () => {
		const { clients } = createSupabaseClientsStub({ tables: { events: { data: null } } });
		const app = await buildRouteTestApp(eventRoutes, { clients });

		const response = await app.inject({ method: 'GET', url: '/api/events/slug/nao-existe' });
		await app.close();

		expect(response.statusCode).toBe(404);
		expect(response.json()).toMatchObject({ status: 404, title: 'EVENT_NOT_FOUND' });
	});

	it('requires a session to list the organizer events', async () => {
		const { clients } = createSupabaseClientsStub();
		const app = await buildRouteTestApp(eventRoutes, { clients });

		const response = await app.inject({ method: 'GET', url: '/api/events' });
		await app.close();

		expect(response.statusCode).toBe(401);
	});
});

describe('event publication during creation', () => {
	const input = { title: 'Conferência', status: 'published', tickets: [{ title: 'Lote 1' }, { title: 'Lote 2' }] };
	it('keeps the event as a draft until every ticket is ready, then publishes it', async () => {
		let visibleStatus: string | undefined;
		const repository = partialMock<EventRepository>({
			canPublishForUser: vi.fn().mockResolvedValue(true),
			deleteForUser: vi.fn().mockResolvedValue(true),
			createForUser: vi.fn(async (_user: string, event: { status?: string }) => {
				visibleStatus = event.status;
				return { ...publishedEvent, status: event.status } as never;
			}),
			updateForUser: vi.fn(async (_user: string, _id: string, patch: { status?: string }) => {
				visibleStatus = patch.status;
				return publishedEvent as never;
			}),
		});
		const tickets: EventTicketCreator = {
			create: vi.fn(async () => {
				expect(visibleStatus).toBe('draft');
			}),
		};
		const result = await new EventService(repository, tickets).create(TEST_USER_ID, input as never);
		expect(tickets.create).toHaveBeenCalledTimes(2);
		expect(visibleStatus).toBe('published');
		expect(result.status).toBe('published');
	});
	it('removes the draft if publishing fails after its tickets were saved', async () => {
		const repository = partialMock<EventRepository>({
			canPublishForUser: vi.fn().mockResolvedValue(true),
			createForUser: vi.fn().mockResolvedValue({ ...publishedEvent, status: 'draft' }),
			updateForUser: vi.fn().mockResolvedValue(null),
			deleteForUser: vi.fn().mockResolvedValue(true),
		});
		await expect(
			new EventService(repository, { create: vi.fn().mockResolvedValue({}) }).create(TEST_USER_ID, input as never),
		).rejects.toBeInstanceOf(EventNotFound);
		expect(repository.deleteForUser).toHaveBeenCalledWith(TEST_USER_ID, TEST_EVENT_ID);
	});
	it('does not create an orphan event when its ticket creator is unavailable', async () => {
		const repository = partialMock<EventRepository>({
			canPublishForUser: vi.fn().mockResolvedValue(true),
			createForUser: vi.fn().mockResolvedValue(publishedEvent),
		});
		await expect(new EventService(repository).create(TEST_USER_ID, input as never)).rejects.toThrow('ticket creator');
		expect(repository.createForUser).not.toHaveBeenCalled();
	});
	it('keeps a requested draft unpublished after its tickets are saved', async () => {
		const repository = partialMock<EventRepository>({
			canPublishForUser: vi.fn().mockResolvedValue(true),
			createForUser: vi.fn().mockResolvedValue({ ...publishedEvent, status: 'draft' }),
			updateForUser: vi.fn(),
		});
		const result = await new EventService(repository, { create: vi.fn().mockResolvedValue({}) }).create(TEST_USER_ID, {
			...input,
			status: 'draft',
		} as never);
		expect(result.status).toBe('draft');
		expect(repository.updateForUser).not.toHaveBeenCalled();
	});
});
