import { hasPlatformPermission, type PlatformAccess, type PlatformPermission } from '@events-manager/contracts';
export function platformPathPermissions(path: string): PlatformPermission[] | null {
	if (path === '/super-admin') return ['platform_overview.read', 'platform_finance.read'];
	if (path === '/super-admin/equipe') return ['platform_users.read'];
	const pairs = [
		['organizadores', 'organizers'],
		['financeiro', 'finance'],
		['taxas', 'settings'],
		['identidade-visual', 'branding'],
		['categorias', 'categories'],
		['conteudo/paginas', 'pages'],
		['conteudo/blog', 'posts'],
		['conteudo/menus', 'navigation'],
		['conteudo/formularios', 'forms'],
		['conteudo/redirecionamentos', 'redirects'],
		['conteudo/midia', 'media'],
		['conteudo/site', 'site'],
	] as const;
	if (path === '/super-admin/conteudo') return ['platform_content.read'];
	for (const [suffix, resource] of pairs)
		if (path === `/super-admin/${suffix}` || path.startsWith(`/super-admin/${suffix}/`))
			return [`platform_${resource}.${path.endsWith('/novo') ? 'update' : 'read'}` as PlatformPermission];

	return null;
}
export function canVisitPlatformPath(access: PlatformAccess | null | undefined, path: string) {
	if (path === '/super-admin/equipe')
		return hasPlatformPermission(access, 'platform_users.read') || hasPlatformPermission(access, 'platform_roles.read');
	const permissions = platformPathPermissions(path);

	return Boolean(permissions && permissions.every((p) => hasPlatformPermission(access, p)));
}
export function preferredPlatformPath(access: PlatformAccess | null | undefined) {
	return (
		[
			'/super-admin',
			'/super-admin/organizadores',
			'/super-admin/financeiro',
			'/super-admin/equipe',
			'/super-admin/conteudo',
			'/super-admin/conteudo/paginas',
			'/super-admin/conteudo/blog',
			'/super-admin/conteudo/menus',
			'/super-admin/conteudo/formularios',
			'/super-admin/conteudo/midia',
			'/super-admin/conteudo/redirecionamentos',
			'/super-admin/conteudo/site',
			'/super-admin/categorias',
			'/super-admin/taxas',
			'/super-admin/identidade-visual',
		].find((path) => canVisitPlatformPath(access, path)) ?? '/perfil'
	);
}
