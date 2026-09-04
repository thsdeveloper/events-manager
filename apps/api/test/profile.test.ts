import { describe, expect, it, vi } from 'vitest';
import { AuthService, type AuthRepository, type AvatarStorage } from '../src/application/auth/auth-service.js';
import { SupabaseAuthRepository } from '../src/infrastructure/supabase/auth-repository.js';
import { SupabaseMediaRepository } from '../src/infrastructure/supabase/media-repository.js';
import { createSupabaseClientsStub, partialMock, TEST_USER_ID } from './support/index.js';

const profile = {
	id: TEST_USER_ID,
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: null,
	location: 'Uberlândia - MG',
	city_id: 3170206,
	city: { id: 3170206, state_id: 31, name: 'Uberlândia', state: { id: 31, uf: 'MG', name: 'Minas Gerais' } },
	title: 'Produtora cultural',
	description: 'Organizo festivais independentes desde 2015.',
	role: 'attendee',
	status: 'active',
};

describe('SupabaseAuthRepository.serialize', () => {
	it('returns the saved profile bio and title so the profile form can show them after a reload', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: { profiles: { data: profile }, organizers: { data: null } },
		});

		const user = await new SupabaseAuthRepository(clients).serialize({ id: TEST_USER_ID, email: profile.email });

		expect(user).toMatchObject({
			title: 'Produtora cultural',
			description: 'Organizo festivais independentes desde 2015.',
			location: 'Uberlândia - MG',
			city_id: 3170206,
		});
	});

	it('leaves bio and title null for a profile that never filled them', async () => {
		const { clients } = createSupabaseClientsStub({
			tables: { profiles: { data: { ...profile, title: null, description: null } }, organizers: { data: null } },
		});

		const user = await new SupabaseAuthRepository(clients).serialize({ id: TEST_USER_ID, email: profile.email });

		expect(user.title).toBeNull();
		expect(user.description).toBeNull();
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

		await service.updateProfile(identity, { title: 'Produtora cultural' });

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
