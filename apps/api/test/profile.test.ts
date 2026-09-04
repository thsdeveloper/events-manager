import { describe, expect, it, vi } from 'vitest';
import {
	AuthService,
	DocumentAlreadyInUse,
	type AuthRepository,
	type AvatarStorage,
} from '../src/application/auth/auth-service.js';
import { authRoutes } from '../src/routes/auth.js';
import { SupabaseAuthRepository } from '../src/infrastructure/supabase/auth-repository.js';
import { SupabaseMediaRepository } from '../src/infrastructure/supabase/media-repository.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const profile = {
	id: TEST_USER_ID,
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: null,
	location: 'Uberlândia - MG',
	city_id: 3170206,
	city: { id: 3170206, state_id: 31, name: 'Uberlândia', state: { id: 31, uf: 'MG', name: 'Minas Gerais' } },
	description: 'Organizo festivais independentes desde 2015.',
	birth_date: '1990-05-20',
	document: '52998224725',
	role: 'attendee',
	status: 'active',
};

describe('SupabaseAuthRepository.serialize', () => {
	it('returns the saved bio, birth date and CPF so the profile form can show them after a reload', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: { profiles: { data: profile }, organizers: { data: null } },
		});

		const user = await new SupabaseAuthRepository(clients).serialize({ id: TEST_USER_ID, email: profile.email });

		expect(user).toMatchObject({
			description: 'Organizo festivais independentes desde 2015.',
			birth_date: '1990-05-20',
			document: '52998224725',
			location: 'Uberlândia - MG',
			city_id: 3170206,
		});
	});

	it('leaves bio and CPF null for a profile that never filled them', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: { profiles: { data: { ...profile, document: null, description: null } }, organizers: { data: null } },
		});

		const user = await new SupabaseAuthRepository(clients).serialize({ id: TEST_USER_ID, email: profile.email });

		expect(user.document).toBeNull();
		expect(user.description).toBeNull();
		expect(user).not.toHaveProperty('title');
	});
});

describe('SupabaseAuthRepository.serialize with several organizations', () => {
	const activeA = { id: '00000000-0000-4000-8000-0000000000a1', name: 'Maya Eventos', status: 'active' };
	const activeB = { id: '00000000-0000-4000-8000-0000000000a2', name: 'Outra Produtora', status: 'active' };
	const pending = { id: '00000000-0000-4000-8000-0000000000a3', name: 'Produtora Aviviva', status: 'pending' };

	function serialize(organizers: unknown[], activeOrganizerId: string | null = null) {
		const { clients } = createSupabaseClientsStub({
			tables: {
				profiles: { data: { ...profile, active_organizer_id: activeOrganizerId } },
				organizers: { data: organizers },
			},
		});

		return new SupabaseAuthRepository(clients).serialize({ id: TEST_USER_ID, email: profile.email });
	}

	it('signs in a user who owns an active and a pending organization, exposing the active one', async () => {
		const user = await serialize([activeA, pending]);

		expect(user.organizer).toMatchObject({ id: activeA.id, status: 'active' });
	});

	it('prefers the organization the user was last working in among several active ones', async () => {
		const user = await serialize([activeA, activeB], activeB.id);

		expect(user.organizer).toMatchObject({ id: activeB.id });
	});

	it('keeps a pending request visible while no organization is active yet', async () => {
		const user = await serialize([pending]);

		expect(user.organizer).toMatchObject({ id: pending.id, status: 'pending' });
	});

	it('has no organization for a plain attendee', async () => {
		const user = await serialize([]);

		expect(user.organizer).toBeNull();
	});
});

describe('AuthService.updateProfile', () => {
	const identity = { id: TEST_USER_ID, email: 'ana@example.com' };
	const previousAvatar = '00000000-0000-4000-8000-000000000050';
	const nextAvatar = '00000000-0000-4000-8000-000000000051';

	function setup(currentAvatar: string | null) {
		const repository = partialMock<AuthRepository>({
			findAvatarId: vi.fn().mockResolvedValue(currentAvatar),
			updateProfile: vi.fn().mockResolvedValue({ id: TEST_USER_ID, avatar: nextAvatar }),
		});
		const avatarStorage: AvatarStorage = { removeOwnedFile: vi.fn().mockResolvedValue(true) };

		return { repository, avatarStorage, service: new AuthService(repository, avatarStorage) };
	}

	it('removes the previous photo from storage once a new one is saved', async () => {
		const { repository, avatarStorage, service } = setup(previousAvatar);

		await expect(service.updateProfile(identity, { avatar: nextAvatar })).resolves.toMatchObject({
			avatar: nextAvatar,
		});

		expect(repository.updateProfile).toHaveBeenCalledWith(identity, { avatar: nextAvatar });
		expect(avatarStorage.removeOwnedFile).toHaveBeenCalledWith(previousAvatar, TEST_USER_ID);
	});

	it('removes the previous photo when the user clears the avatar', async () => {
		const { avatarStorage, service } = setup(previousAvatar);

		await service.updateProfile(identity, { avatar: null });

		expect(avatarStorage.removeOwnedFile).toHaveBeenCalledWith(previousAvatar, TEST_USER_ID);
	});

	it('keeps the photo when the update does not touch the avatar', async () => {
		const { repository, avatarStorage, service } = setup(previousAvatar);

		await service.updateProfile(identity, { description: 'Produtora cultural' });

		expect(repository.findAvatarId).not.toHaveBeenCalled();
		expect(avatarStorage.removeOwnedFile).not.toHaveBeenCalled();
	});

	it('keeps the photo when the same avatar is sent again', async () => {
		const { avatarStorage, service } = setup(previousAvatar);

		await service.updateProfile(identity, { avatar: previousAvatar });

		expect(avatarStorage.removeOwnedFile).not.toHaveBeenCalled();
	});

	it('does nothing when there was no previous photo', async () => {
		const { avatarStorage, service } = setup(null);

		await service.updateProfile(identity, { avatar: nextAvatar });

		expect(avatarStorage.removeOwnedFile).not.toHaveBeenCalled();
	});

	it('still returns the saved profile when the old file cannot be removed', async () => {
		const { avatarStorage, service } = setup(previousAvatar);
		vi.mocked(avatarStorage.removeOwnedFile).mockRejectedValue(new Error('storage down'));

		await expect(service.updateProfile(identity, { avatar: nextAvatar })).resolves.toMatchObject({
			avatar: nextAvatar,
		});
	});

	it('does not touch storage when the profile update itself fails', async () => {
		const { repository, avatarStorage, service } = setup(previousAvatar);
		vi.mocked(repository.updateProfile).mockRejectedValue(new Error('db down'));

		await expect(service.updateProfile(identity, { avatar: nextAvatar })).rejects.toThrow('db down');
		expect(avatarStorage.removeOwnedFile).not.toHaveBeenCalled();
	});
});

describe('SupabaseMediaRepository.removeOwnedFile', () => {
	const fileId = '00000000-0000-4000-8000-000000000050';

	it('deletes the record and the storage object of a file the user uploaded', async () => {
		const { clients, from, storage, storageBucket } = createSupabaseClientsStub({
			tables: { media_files: { data: { bucket: 'media', path: `${TEST_USER_ID}/avatars/old.png` } } },
		});

		await expect(new SupabaseMediaRepository(clients).removeOwnedFile(fileId, TEST_USER_ID)).resolves.toBe(true);

		expect(from).toHaveBeenCalledWith('media_files');
		expect(storage.from).toHaveBeenCalledWith('media');
		expect(storageBucket.remove).toHaveBeenCalledWith([`${TEST_USER_ID}/avatars/old.png`]);
	});

	it('leaves a file alone when it does not belong to the user', async () => {
		const { clients, storageBucket } = createSupabaseClientsStub({ tables: { media_files: { data: null } } });

		await expect(new SupabaseMediaRepository(clients).removeOwnedFile(fileId, TEST_USER_ID)).resolves.toBe(false);

		expect(storageBucket.remove).not.toHaveBeenCalled();
	});
});

describe('CPF already used by another account', () => {
	const duplicate = {
		code: '23505',
		message: 'duplicate key value violates unique constraint "profiles_document_key"',
		details: 'Key (document)=(52998224725) already exists.',
	};

	it('is reported by the repository as a domain error, not a raw database failure', async () => {
		const { clients } = createSupabaseClientsStub({ tables: { profiles: { data: null, error: duplicate } } });

		await expect(
			new SupabaseAuthRepository(clients).updateProfile(
				{ id: TEST_USER_ID, email: profile.email },
				{ document: '52998224725' },
			),
		).rejects.toBeInstanceOf(DocumentAlreadyInUse);
	});

	it('answers the profile update with a specific conflict the form can show on the field', async () => {
		const { clients } = createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: profile.email },
			// 1ª leitura: CPF atual (nenhum); 2ª: a escrita, recusada pelo índice único.
			tables: {
				profiles: [{ data: { document: null } }, { data: null, error: duplicate }],
				event_registrations: { data: [] },
			},
		});
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv(), clients });

		const response = await app.inject({
			method: 'PATCH',
			url: '/api/user/profile',
			headers: sessionCookie(),
			payload: { document: '529.982.247-25', current_password: 'Qsesbs2006#@!' },
		});
		await app.close();

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({
			title: 'DOCUMENT_ALREADY_IN_USE',
			detail: 'Este CPF já está cadastrado em outra conta.',
			context: { field: 'document' },
		});
	});

	it('still maps other unique violations to the generic conflict', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: { profiles: { data: null, error: { ...duplicate, message: 'violates unique constraint "other_key"' } } },
		});

		await expect(
			new SupabaseAuthRepository(clients).updateProfile(
				{ id: TEST_USER_ID, email: profile.email },
				{ document: '52998224725' },
			),
		).rejects.not.toBeInstanceOf(DocumentAlreadyInUse);
	});
});

describe('CPF change policy', () => {
	const identity = { id: TEST_USER_ID, email: 'ana@example.com' };
	const CPF_A = '52998224725';
	const CPF_B = '11144477735';

	function setup(options: { document?: string | null; billing?: boolean; passwordValid?: boolean } = {}) {
		const repository = partialMock<AuthRepository>({
			findDocument: vi.fn().mockResolvedValue(options.document ?? null),
			hasBillingActivity: vi.fn().mockResolvedValue(options.billing ?? false),
			verifyPassword: vi.fn().mockResolvedValue(options.passwordValid ?? true),
			recordDocumentChange: vi.fn().mockResolvedValue(undefined),
			updateProfile: vi.fn().mockResolvedValue({ id: TEST_USER_ID, document: CPF_B }),
		});
		const notifications = { documentChanged: vi.fn().mockResolvedValue(undefined) };
		const service = new AuthService(repository, undefined, notifications);

		return { repository, notifications, service };
	}

	it('refuses to change a CPF that is already tied to paid activity', async () => {
		const { repository, service } = setup({ document: CPF_A, billing: true });

		await expect(
			service.updateProfile(identity, { document: CPF_B, current_password: 'Qsesbs2006#@!' }),
		).rejects.toMatchObject({ statusCode: 409, code: 'DOCUMENT_LOCKED', context: { field: 'document' } });
		expect(repository.updateProfile).not.toHaveBeenCalled();
	});

	it('still lets a first CPF be entered after purchases made without one', async () => {
		const { repository, service } = setup({ document: null, billing: true });

		await service.updateProfile(identity, { document: CPF_B, current_password: 'Qsesbs2006#@!' });

		expect(repository.updateProfile).toHaveBeenCalled();
	});

	it('requires the current password to change the CPF', async () => {
		const { repository, service } = setup({ document: CPF_A });

		await expect(service.updateProfile(identity, { document: CPF_B })).rejects.toMatchObject({
			statusCode: 403,
			code: 'REAUTHENTICATION_REQUIRED',
			context: { field: 'current_password' },
		});
		expect(repository.updateProfile).not.toHaveBeenCalled();
	});

	it('rejects a wrong current password without saving', async () => {
		const { repository, service } = setup({ document: CPF_A, passwordValid: false });

		await expect(
			service.updateProfile(identity, { document: CPF_B, current_password: 'errada' }),
		).rejects.toMatchObject({
			code: 'INVALID_CURRENT_PASSWORD',
			context: { field: 'current_password' },
		});
		expect(repository.verifyPassword).toHaveBeenCalledWith(identity.email, 'errada');
		expect(repository.updateProfile).not.toHaveBeenCalled();
	});

	it('records the change in the audit trail and notifies the account owner', async () => {
		const { repository, notifications, service } = setup({ document: CPF_A });

		await service.updateProfile(
			identity,
			{ document: CPF_B, current_password: 'Qsesbs2006#@!' },
			{ ip: '203.0.113.7', userAgent: 'Mozilla/5.0' },
		);

		expect(repository.recordDocumentChange).toHaveBeenCalledWith({
			userId: TEST_USER_ID,
			previousDocument: CPF_A,
			newDocument: CPF_B,
			changedBy: 'user',
			ip: '203.0.113.7',
			userAgent: 'Mozilla/5.0',
		});
		expect(notifications.documentChanged).toHaveBeenCalledWith(
			expect.objectContaining({ email: identity.email, changedAt: expect.any(Date) }),
		);
	});

	it('never sends the current password to the profile table', async () => {
		const { repository, service } = setup({ document: CPF_A });

		await service.updateProfile(identity, { document: CPF_B, current_password: 'Qsesbs2006#@!' });

		expect(repository.updateProfile).toHaveBeenCalledWith(identity, { document: CPF_B });
	});

	it('asks nothing extra when the CPF is not part of the update or is unchanged', async () => {
		const { repository, notifications, service } = setup({ document: CPF_A });

		await service.updateProfile(identity, { description: 'Sem mudar o CPF' });
		await service.updateProfile(identity, { document: CPF_A });

		expect(repository.verifyPassword).not.toHaveBeenCalled();
		expect(repository.recordDocumentChange).not.toHaveBeenCalled();
		expect(notifications.documentChanged).not.toHaveBeenCalled();
		expect(repository.updateProfile).toHaveBeenCalledTimes(2);
	});

	it('still saves the profile when the notice cannot be sent', async () => {
		const { notifications, service } = setup({ document: CPF_A });
		notifications.documentChanged.mockRejectedValue(new Error('smtp down'));

		await expect(
			service.updateProfile(identity, { document: CPF_B, current_password: 'Qsesbs2006#@!' }),
		).resolves.toMatchObject({ document: CPF_B });
	});
});

describe('SupabaseAuthRepository CPF policy queries', () => {
	it('detects paid activity from the registrations of the user', async () => {
		const { clients, from } = createSupabaseClientsStub({
			tables: { event_registrations: { data: [{ id: 'reg-1' }] } },
		});

		await expect(new SupabaseAuthRepository(clients).hasBillingActivity(TEST_USER_ID)).resolves.toBe(true);
		expect(from).toHaveBeenCalledWith('event_registrations');
	});

	it('reports no activity for a user who never paid for anything', async () => {
		const { clients } = createSupabaseClientsStub({ tables: { event_registrations: { data: [] } } });

		await expect(new SupabaseAuthRepository(clients).hasBillingActivity(TEST_USER_ID)).resolves.toBe(false);
	});

	it('reads the current CPF of the profile', async () => {
		const { clients } = createSupabaseClientsStub({ tables: { profiles: { data: { document: '52998224725' } } } });

		await expect(new SupabaseAuthRepository(clients).findDocument(TEST_USER_ID)).resolves.toBe('52998224725');
	});

	it('writes every CPF change to the audit table', async () => {
		const { clients, from } = createSupabaseClientsStub({ tables: { profile_document_changes: { data: null } } });

		await new SupabaseAuthRepository(clients).recordDocumentChange({
			userId: TEST_USER_ID,
			previousDocument: '52998224725',
			newDocument: '11144477735',
			changedBy: 'user',
			ip: '203.0.113.7',
			userAgent: 'Mozilla/5.0',
		});

		expect(from).toHaveBeenCalledWith('profile_document_changes');
	});

	it('exposes whether the CPF is locked so the form can show it read-only', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: {
				profiles: { data: profile },
				organizers: { data: [] },
				event_registrations: { data: [{ id: 'reg-1' }] },
			},
		});

		const user = await new SupabaseAuthRepository(clients).serialize({ id: TEST_USER_ID, email: profile.email });

		expect(user.document_locked).toBe(true);
	});
});

describe('profile route CPF policy', () => {
	it('answers a locked CPF with a conflict pointing at the field', async () => {
		const { clients } = createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: profile.email },
			tables: {
				profiles: { data: { ...profile, document: '52998224725' } },
				event_registrations: { data: [{ id: 'reg-1' }] },
			},
		});
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv(), clients });

		const response = await app.inject({
			method: 'PATCH',
			url: '/api/user/profile',
			headers: sessionCookie(),
			payload: { document: '111.444.777-35', current_password: 'Qsesbs2006#@!' },
		});
		await app.close();

		expect(response.statusCode).toBe(409);
		expect(response.json()).toMatchObject({ title: 'DOCUMENT_LOCKED', context: { field: 'document' } });
	});

	it('answers a CPF change without the password with a reauthentication problem', async () => {
		const { clients } = createSupabaseClientsStub({
			user: { id: TEST_USER_ID, email: profile.email },
			tables: { profiles: { data: { ...profile, document: null } }, event_registrations: { data: [] } },
		});
		const app = await buildRouteTestApp(authRoutes, { env: createTestEnv(), clients });

		const response = await app.inject({
			method: 'PATCH',
			url: '/api/user/profile',
			headers: sessionCookie(),
			payload: { document: '111.444.777-35' },
		});
		await app.close();

		expect(response.statusCode).toBe(403);
		expect(response.json()).toMatchObject({
			title: 'REAUTHENTICATION_REQUIRED',
			context: { field: 'current_password' },
		});
	});
});
