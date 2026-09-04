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
				findPublicBySlug: vi.fn().mockResolvedValue(structuredClone(publishedEvent)),
			});

			const event = await new EventService(repository).getPublicBySlug('conferencia');

			expect((event.tickets as Array<{ id: string }>).map((ticket) => ticket.id)).toEqual(['t-0', 't-1', 't-2']);
		});

		it('signals a missing event with a domain error instead of returning null', async () => {
			const repository = partialMock<EventRepository>({ findPublicBySlug: vi.fn().mockResolvedValue(null) });

			await expect(new EventService(repository).getPublicBySlug('inexistente')).rejects.toBeInstanceOf(EventNotFound);
		});
	});

	describe('listPublic', () => {
		it('derives pagination metadata from the repository total', async () => {
			const repository = partialMock<EventRepository>({
				listPublic: vi.fn().mockResolvedValue({ data: [{ id: 'a' }, { id: 'b' }], total: 25 }),
			});

			const result = await new EventService(repository).listPublic({ limit: 12, page: 2, search: '' });

			expect(result.pagination).toEqual({ limit: 12, page: 2, pageCount: 3, total: 25 });
			expect(repository.listPublic).toHaveBeenCalledWith({ limit: 12, page: 2, search: '' });
		});
	});

	describe('create', () => {
		const eventInput = { title: 'Evento' };

		it('requires an active organizer profile', async () => {
			const repository = partialMock<EventRepository>({
				createForUser: vi.fn().mockResolvedValue('organizer_required'),
			});

			await expect(
				new EventService(repository).create(TEST_USER_ID, { ...eventInput, tickets: [] } as never),
			).rejects.toBeInstanceOf(OrganizerRequired);
		});

		it('rolls the event back when one of its tickets cannot be created', async () => {
			const repository = partialMock<EventRepository>({
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
