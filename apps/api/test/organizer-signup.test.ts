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
	'findByDocument',
	'findById',
	'setLogo',
	'stats',
	'updateById',
	'updatePayout',
];

function setup() {
	const repository = fakePort<OrganizerRepository>(repositoryMethods);
	repository.findByDocument.mockResolvedValue(null);
	repository.create.mockImplementation(async (_user, input) => ({ id: 'org-1', ...input }));
	return { repository, service: new OrganizerService(repository as unknown as OrganizerRepository) };
}

// Pessoa física só escolhe o que é opcional: nome, e-mail, telefone e CPF vêm do perfil.
const individual = {
	account_type: 'individual' as const,
	description: null,
	website: null,
	accept_terms: true as const,
};

const company = {
	account_type: 'company' as const,
	name: 'Festivais Ltda',
	email: 'ana@example.com',
	phone: '11999990000',
	document: '45723174000110',
	description: null,
	website: null,
	accept_terms: true as const,
};

const verifiedProfile = {
	document: '52998224725',
	first_name: 'Ana',
	last_name: 'Silva',
	email: 'ana@example.com',
	phone: '11999990000',
};

describe('OrganizerService.create', () => {
	it('registers an individual with the name, e-mail, phone and CPF validated on the profile, never the ones sent by the client', async () => {
		const { repository, service } = setup();
		const tampered = { ...individual, name: 'Outro Nome', email: 'outro@example.com', phone: '11988887777' } as never;

		const organizer = await service.create(TEST_USER_ID, tampered, 'active', { profile: verifiedProfile });

		expect(organizer).toMatchObject({ id: 'org-1', document: '52998224725', name: 'Ana Silva' });
		expect(repository.create).toHaveBeenCalledWith(
			TEST_USER_ID,
			expect.objectContaining({
				document: '52998224725',
				name: 'Ana Silva',
				email: 'ana@example.com',
				phone: '11999990000',
			}),
			'active',
		);
	});

	it('cannot register an individual whose profile has no CPF', async () => {
		const { repository, service } = setup();

		await expect(
			service.create(TEST_USER_ID, individual, 'active', { profile: { ...verifiedProfile, document: null } }),
		).rejects.toMatchObject({ statusCode: 422, code: 'PROFILE_DOCUMENT_REQUIRED' });
		expect(repository.create).not.toHaveBeenCalled();
	});

	it('cannot register an individual whose profile lacks name, e-mail or phone', async () => {
		const { repository, service } = setup();

		await expect(
			service.create(TEST_USER_ID, individual, 'active', { profile: { ...verifiedProfile, phone: null } }),
		).rejects.toMatchObject({ statusCode: 422, code: 'PROFILE_INCOMPLETE' });
		await expect(
			service.create(TEST_USER_ID, individual, 'active', { profile: { ...verifiedProfile, last_name: null } }),
		).rejects.toMatchObject({ statusCode: 422, code: 'PROFILE_INCOMPLETE' });
		expect(repository.create).not.toHaveBeenCalled();
	});

	it('registers a company with its own CNPJ', async () => {
		const { repository, service } = setup();

		await service.create(TEST_USER_ID, company, 'pending', { profile: verifiedProfile });

		expect(repository.create).toHaveBeenCalledWith(
			TEST_USER_ID,
			expect.objectContaining({ document: '45723174000110', name: 'Festivais Ltda' }),
			'pending',
		);
	});

	it('allows another company for someone who already owns an organizer account', async () => {
		const { repository, service } = setup();
		await expect(service.create(TEST_USER_ID, company, 'active', { profile: verifiedProfile })).resolves.toMatchObject({
			name: company.name,
		});
	});

	it('refuses a second individual account using the same profile CPF', async () => {
		const { repository, service } = setup();
		repository.findByDocument.mockResolvedValue({ id: 'existing', user_id: TEST_USER_ID });
		await expect(
			service.create(TEST_USER_ID, individual, 'active', { profile: verifiedProfile }),
		).rejects.toMatchObject({ statusCode: 409, code: 'DOCUMENT_IN_USE' });
		expect(repository.create).not.toHaveBeenCalled();
	});

	it('reports a document conflict if a concurrent signup already created the account', async () => {
		const { repository, service } = setup();
		repository.create.mockResolvedValue('exists');
		await expect(service.create(TEST_USER_ID, company, 'active', { profile: verifiedProfile })).rejects.toMatchObject({
			statusCode: 409,
			code: 'DOCUMENT_IN_USE',
		});
	});

	it('refuses a CNPJ that already belongs to another organizer', async () => {
		const { repository, service } = setup();
		repository.findByDocument.mockResolvedValue({ id: 'other', user_id: 'someone-else' });

		await expect(service.create(TEST_USER_ID, company, 'active', { profile: verifiedProfile })).rejects.toMatchObject({
			statusCode: 409,
			code: 'DOCUMENT_IN_USE',
		});
	});
});

describe('AuthService.createOrganizer', () => {
	it('does not allow the legacy name-and-email endpoint to bypass the full additional-account signup', async () => {
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

	async function app(options: { duplicate?: boolean; created?: Record<string, unknown>; incomplete?: boolean } = {}) {
		const stub = createSupabaseClientsStub({
			user: identity,
			tables: {
				profiles: { data: options.incomplete ? { ...profile, document: null } : profile },
				organizers: [
					{ data: [{ id: 'existing', user_id: TEST_USER_ID, status: 'active' }] },
					{ data: options.duplicate ? { id: 'existing', user_id: TEST_USER_ID } : null },
				],
				event_registrations: { data: [] },
			},
			rpc: { data: options.created ?? { id: 'org-new', status: 'active' } },
		});
		return { app: await buildRouteTestApp(organizerRoutes, { env: createTestEnv(), clients: stub.clients }), stub };
	}

	it('creates an individual organizer with the profile CPF and contact data, ignoring whatever the client sent', async () => {
		const { app: server, stub } = await app();

		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: {
				...individual,
				name: 'Outro Nome',
				email: 'outro@example.com',
				phone: '(11) 98888-7777',
				document: '00000000000',
			},
		});

		expect(response.statusCode).toBe(201);
		expect(response.json()).toMatchObject({ success: true, organizer: { id: 'org-new' } });
		expect(stub.clients.admin.rpc).toHaveBeenCalledWith(
			'create_organizer_profile',
			expect.objectContaining({
				target_document: '52998224725',
				target_name: 'Ana Silva',
				target_email: 'ana@example.com',
				target_phone: '11999990000',
				target_status: 'active',
			}),
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

	it('answers 409 when the CPF is already registered', async () => {
		const { app: server, stub } = await app({ duplicate: true });

		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: individual,
		});

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({ title: 'DOCUMENT_IN_USE' });
		expect(stub.clients.admin.rpc).not.toHaveBeenCalledWith('create_organizer_profile', expect.anything());
	});

	it('selects a newly active account and clears the previous event filter', async () => {
		const { app: server } = await app();
		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: company,
		});
		expect(response.statusCode).toBe(201);
		expect(response.cookies).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ name: 'active_organizer_id', value: 'org-new', httpOnly: true }),
				expect.objectContaining({ name: 'active_event', value: '' }),
			]),
		);
	});

	it('preserves the current workspace when the new account awaits approval', async () => {
		const { app: server } = await app({ created: { id: 'org-new', status: 'pending' } });
		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: company,
		});
		expect(response.statusCode).toBe(201);
		expect(response.cookies).toEqual([]);
	});

	it('still requires a complete validated profile for additional accounts', async () => {
		const { app: server, stub } = await app({ incomplete: true });
		const response = await server.inject({
			method: 'POST',
			url: '/api/organizer/request',
			headers: sessionCookie(),
			payload: company,
		});
		expect(response.statusCode).toBe(403);
		expect(stub.clients.admin.rpc).not.toHaveBeenCalledWith('create_organizer_profile', expect.anything());
	});

	it('requires a session', async () => {
		const stub = createSupabaseClientsStub({ user: null });
		const server = await buildRouteTestApp(organizerRoutes, { env: createTestEnv(), clients: stub.clients });

		const response = await server.inject({ method: 'POST', url: '/api/organizer/request', payload: individual });

		expect(response.statusCode).toBe(401);
	});
});

it('does not allow changing the fiscal document after a receiving submission', async () => {
	const repository = partialMock<OrganizerRepository>({
		findById: vi.fn().mockResolvedValue({ document: '52998224725', current_receiving_request_id: 'request-id' }),
		updateById: vi.fn(),
	});
	await expect(new OrganizerService(repository).update('org', { document: '45723174000110' })).rejects.toMatchObject({
		code: 'VERIFIED_DOCUMENT_IMMUTABLE',
	});
	expect(repository.updateById).not.toHaveBeenCalled();
});
