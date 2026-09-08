import { describe, expect, it, vi } from 'vitest';
import { AuthService, type AuthRepository } from '../src/application/auth/auth-service.js';
import { OrganizerService, type OrganizerRepository } from '../src/application/organizers/organizer-service.js';
import { organizerRoutes } from '../src/routes/organizers.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	fakePort,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const repositoryMethods: Array<keyof OrganizerRepository> = [
	'create',
	'existsForUser',
	'findByDocument',
	'findById',
	'setLogo',
	'stats',
	'updateById',
	'updatePayout',
];

function setup() {
	const repository = fakePort<OrganizerRepository>(repositoryMethods);
	repository.existsForUser.mockResolvedValue(false);
	repository.findByDocument.mockResolvedValue(null);
	repository.create.mockImplementation(async (_user, input) => ({ id: 'org-1', ...input }));
	return { repository, service: new OrganizerService(repository as unknown as OrganizerRepository) };
}

const individual = {
	account_type: 'individual' as const,
	name: 'Ana Produções',
	email: 'ana@example.com',
	phone: '11999990000',
	description: null,
	website: null,
	accept_terms: true as const,
};

const company = { ...individual, account_type: 'company' as const, name: 'Festivais Ltda', document: '45723174000110' };

describe('OrganizerService.create', () => {
	it('registers an individual with the CPF already validated on the profile, never one sent by the client', async () => {
		const { repository, service } = setup();

		const organizer = await service.create(TEST_USER_ID, individual, 'active', { profileDocument: '52998224725' });

		expect(organizer).toMatchObject({ id: 'org-1', document: '52998224725', name: 'Ana Produções' });
		expect(repository.create).toHaveBeenCalledWith(
			TEST_USER_ID,
			expect.objectContaining({ document: '52998224725', phone: '11999990000', email: 'ana@example.com' }),
			'active',
		);
	});

	it('cannot register an individual whose profile has no CPF', async () => {
		const { repository, service } = setup();

		await expect(service.create(TEST_USER_ID, individual, 'active', { profileDocument: null })).rejects.toMatchObject({
			statusCode: 422,
			code: 'PROFILE_DOCUMENT_REQUIRED',
		});
		expect(repository.create).not.toHaveBeenCalled();
	});

	it('registers a company with its own CNPJ', async () => {
		const { repository, service } = setup();

		await service.create(TEST_USER_ID, company, 'pending', { profileDocument: '52998224725' });

		expect(repository.create).toHaveBeenCalledWith(
			TEST_USER_ID,
			expect.objectContaining({ document: '45723174000110', name: 'Festivais Ltda' }),
			'pending',
		);
	});

	it('refuses a second organizer account for the same person', async () => {
		const { repository, service } = setup();
		repository.existsForUser.mockResolvedValue(true);

		await expect(service.create(TEST_USER_ID, company, 'active', { profileDocument: null })).rejects.toMatchObject({
			statusCode: 409,
			code: 'ORGANIZER_EXISTS',
		});
		expect(repository.create).not.toHaveBeenCalled();
	});

	it('refuses a CNPJ that already belongs to another organizer', async () => {
		const { repository, service } = setup();
		repository.findByDocument.mockResolvedValue({ id: 'other', user_id: 'someone-else' });

		await expect(service.create(TEST_USER_ID, company, 'active', { profileDocument: null })).rejects.toMatchObject({
			statusCode: 409,
			code: 'DOCUMENT_IN_USE',
		});
	});
});

describe('AuthService.createOrganizer', () => {
	it('keeps the one-organizer rule for the organization switcher as well', async () => {
		const repository = partialMock<AuthRepository>({
			listOrganizers: vi.fn().mockResolvedValue([{ id: 'org-1', status: 'active' }]),
			createOrganizer: vi.fn(),
		});

		await expect(
			new AuthService(repository).createOrganizer(TEST_USER_ID, { name: 'Outra', email: 'x@y.com' }),
		).rejects.toMatchObject({ statusCode: 409, code: 'ORGANIZER_EXISTS' });
		expect(repository.createOrganizer).not.toHaveBeenCalled();
	});
});

describe('POST /api/organizer/request', () => {
	const identity = { id: TEST_USER_ID, email: 'ana@example.com' };
	const profile = {
		id: TEST_USER_ID,
		email: 'ana@example.com',
		first_name: 'Ana',
		last_name: 'Silva',
		avatar: 'media-1',
		birth_date: '1990-05-20',
		document: '52998224725',
		phone: '11999990000',
		phone_verified_at: '2026-09-04T19:00:00.000Z',
		location: 'Uberlândia - MG',
		description: 'Gosto de festivais.',
		role: 'attendee',
		status: 'active',
	};

	async function app(options: { existing?: boolean; created?: Record<string, unknown> } = {}) {
		const stub = createSupabaseClientsStub({
			user: identity,
			tables: {
				profiles: { data: profile },
				// Primeira consulta: conta as organizações da pessoa; segunda: procura o CNPJ.
				organizers: options.existing ? { data: null, count: 1 } : [{ data: null, count: 0 }, { data: null }],
				event_registrations: { data: [] },
			},
			rpc: { data: options.created ?? { id: 'org-new', status: 'active' } },
		});
		return { app: await buildRouteTestApp(organizerRoutes, { env: createTestEnv(), clients: stub.clients }), stub };
	}

	it('creates an individual organizer with the profile CPF and the contact data sent', async () => {
		const { app: server, stub } = await app();

		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: { ...individual, phone: '(11) 99999-0000', document: '00000000000' },
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ success: true, organizer: { id: 'org-new' } });
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'create_organizer_profile',
			expect.objectContaining({ target_document: '52998224725', target_phone: '11999990000', target_status: 'active' }),
		);
	});

	it('creates a company organizer with the CNPJ informed', async () => {
		const { app: server, stub } = await app();

		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: { ...company, document: '45.723.174/0001-10' },
		});

		expect(response.statusCode).toBe(201);
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'create_organizer_profile',
			expect.objectContaining({ target_document: '45723174000110', target_name: 'Festivais Ltda' }),
		);
	});

	it('rejects an invalid CNPJ and a missing account type with field errors', async () => {
		const { app: server } = await app();

		const invalid = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: { ...company, document: '11.111.111/1111-11' },
		});
		const untyped = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: { name: 'X', email: 'x@y.com', phone: '11999990000', accept_terms: true },
		});

		expect(invalid.statusCode).toBe(422);
		expect(invalid.json().context.errors.fieldErrors).toHaveProperty('document');
		expect(untyped.statusCode).toBe(422);
	});

	it('answers 409 when the person already has an organizer account', async () => {
		const { app: server, stub } = await app({ existing: true });

		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: individual,
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({ title: 'ORGANIZER_EXISTS' });
		expect(stub.clients.admin.rpc).not.toHaveBeenCalled();
	});

	it('requires a session', async () => {
		const stub = createSupabaseClientsStub({ user: null });
		const server = await buildRouteTestApp(organizerRoutes, { env: createTestEnv(), clients: stub.clients });

		const response = await server.inject({ method: 'POST', url: '/api/organizer/request', payload: individual });

		expect(response.statusCode).toBe(401);
	});
});
