import { describe, expect, it, vi } from 'vitest';
import { OrganizerService, type OrganizerRepository } from '../src/application/organizers/organizer-service.js';
import type { MediaRepository } from '../src/application/media/media-service.js';
import { partialMock } from './support/index.js';

function setup(logo: unknown = { id: 'old-logo' }) {
	let saved: string | null = 'old-logo';
	const repository = partialMock<OrganizerRepository>({
		findById: vi.fn().mockResolvedValue({ id: 'organizer', logo }),
		setLogo: vi.fn(async (_id, mediaId) => {
			saved = mediaId;
			return { id: 'organizer', logo: mediaId };
		}),
	});
	const media = partialMock<MediaRepository>({
		removeOwnedFile: vi.fn(async () => {
			expect(saved).not.toBe('old-logo');
			return true;
		}),
	});
	return { service: new OrganizerService(repository, media), repository, media };
}

describe('organizer logo lifecycle', () => {
	it('saves the replacement before deleting the previous file owned by the caller', async () => {
		const { service, media } = setup();
		await expect(service.setLogo('organizer', 'new-logo', 'owner')).resolves.toMatchObject({
			organizer: { logo: 'new-logo' },
			cleanupPending: false,
		});
		expect(media.removeOwnedFile).toHaveBeenCalledWith('old-logo', 'owner');
	});
	it('detaches the logo and deletes its file when removing', async () => {
		const { service, media } = setup();
		await expect(service.setLogo('organizer', null, 'owner')).resolves.toMatchObject({ organizer: { logo: null } });
		expect(media.removeOwnedFile).toHaveBeenCalledWith('old-logo', 'owner');
	});
	it('keeps the previous logo and cleans the new upload if saving the replacement fails', async () => {
		const { service, repository, media } = setup();
		vi.mocked(repository.setLogo).mockRejectedValue(new Error('save failed'));
		vi.mocked(media.removeOwnedFile).mockResolvedValue(true);
		await expect(service.setLogo('organizer', 'new-logo', 'owner')).rejects.toThrow('save failed');
		expect(media.removeOwnedFile).toHaveBeenCalledExactlyOnceWith('new-logo', 'owner');
	});
	it('reports cleanup failure without undoing the successfully saved new logo', async () => {
		const { service, media } = setup('old-logo');
		vi.mocked(media.removeOwnedFile).mockRejectedValue(new Error('storage unavailable'));
		await expect(service.setLogo('organizer', 'new-logo', 'owner')).resolves.toMatchObject({
			organizer: { logo: 'new-logo' },
			cleanupPending: true,
		});
	});
	it.each([null, { id: 'new-logo' }])(
		'never deletes the current logo or a missing previous logo (%j)',
		async (logo) => {
			const { service, media } = setup(logo);
			await service.setLogo('organizer', 'new-logo', 'owner');
			expect(media.removeOwnedFile).not.toHaveBeenCalled();
		},
	);
});
