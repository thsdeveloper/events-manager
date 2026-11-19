import { it, expect } from 'vitest';
import type { PlatformAccess } from '@events-manager/contracts';
import { canVisitPlatformPath, preferredPlatformPath } from './policy';
const access: PlatformAccess = { userId: 'u', active: true, isRoot: false, permissions: ['platform_organizers.read'] };
it('routes support members to organizers and hides finance and team', () => {
	expect(canVisitPlatformPath(access, '/super-admin/organizadores/123')).toBe(true);
	expect(canVisitPlatformPath(access, '/super-admin/financeiro')).toBe(false);
	expect(canVisitPlatformPath(access, '/super-admin/equipe')).toBe(false);
	expect(preferredPlatformPath(access)).toBe('/super-admin/organizadores');
});
it('requires editing permission for new content and denies unknown pages', () => {
	const reader = { ...access, permissions: ['platform_pages.read'] as const };
	expect(
		canVisitPlatformPath({ ...reader, permissions: [...reader.permissions] }, '/super-admin/conteudo/paginas/123'),
	).toBe(true);
	expect(
		canVisitPlatformPath({ ...reader, permissions: [...reader.permissions] }, '/super-admin/conteudo/paginas/novo'),
	).toBe(false);
	expect(canVisitPlatformPath(access, '/super-admin/unknown')).toBe(false);
	expect(canVisitPlatformPath({ ...access, active: false }, '/super-admin/organizadores')).toBe(false);
});
