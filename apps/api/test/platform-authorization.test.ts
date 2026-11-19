import { describe, it, expect, vi } from 'vitest';
import { PlatformAuthorization } from '../src/application/iam/platform-authorization.js';
describe('platform authorization', () => {
	it.each([false, true])('rejects missing financial authority regardless of root flag %s', async (isRoot) => {
		const repo = {
			access: vi.fn().mockResolvedValue({ active: true, isRoot, permissions: ['platform_organizers.read'] }),
			denied: vi.fn(),
		};
		await expect(new PlatformAuthorization(repo).require('user', ['platform_finance.read'])).rejects.toMatchObject({
			statusCode: 403,
		});
		expect(repo.denied).toHaveBeenCalledWith('user', 'platform_finance.read');
	});
	it('rechecks revoked membership without cached JWT claims', async () => {
		const repo = {
			access: vi
				.fn()
				.mockResolvedValueOnce({ active: true, permissions: ['platform_finance.read'] })
				.mockResolvedValueOnce({ active: false, permissions: [] }),
			denied: vi.fn(),
		};
		const auth = new PlatformAuthorization(repo);
		await expect(auth.require('user', ['platform_finance.read'])).resolves.toMatchObject({ active: true });
		await expect(auth.require('user', ['platform_finance.read'])).rejects.toMatchObject({ statusCode: 403 });
	});
});
