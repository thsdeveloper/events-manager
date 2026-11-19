import { it, expect, vi } from 'vitest';
import { mockFetch, jsonResponse, problemResponse } from '@/test/fetch';
import { getPlatformPermissions, canOpenPlatformPage } from './server';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ toString: () => 'access_token=test' }) }));
it('loads current platform access through the private API and permits only granted pages', async () => {
	const fetcher = mockFetch([
		[
			/\/api\/super-admin\/iam\/access$/,
			() => jsonResponse({ userId: 'member', active: true, isRoot: false, permissions: ['platform_organizers.read'] }),
		],
	]);
	expect(await canOpenPlatformPage('/super-admin/organizadores')).toBe(true);
	expect(await canOpenPlatformPage('/super-admin/financeiro')).toBe(false);
	expect(fetcher).toHaveBeenCalledWith(
		expect.stringContaining('/api/super-admin/iam/access'),
		expect.objectContaining({ cache: 'no-store', headers: { cookie: 'access_token=test' } }),
	);
});
it.each([401, 403])('treats expired or revoked platform sessions as denied (%s)', async (status) => {
	mockFetch([[/\/api\/super-admin\/iam\/access$/, () => problemResponse(status, 'DENIED', 'Acesso negado')]]);
	expect(await getPlatformPermissions()).toBeNull();
	expect(await canOpenPlatformPage('/super-admin/equipe')).toBe(false);
});
it('propagates server failures instead of silently granting or falling back to a global role', async () => {
	mockFetch([[/\/api\/super-admin\/iam\/access$/, () => problemResponse(500, 'INTERNAL_ERROR', 'Falha temporária')]]);
	await expect(getPlatformPermissions()).rejects.toMatchObject({ status: 500 });
});
