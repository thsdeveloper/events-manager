import {
	hasPermission,
	hasAnyEventPermission,
	permissionDefinitions,
	type IamAccess,
	type IamRole,
	type Permission,
} from '@events-manager/contracts';
export function canVisitAdminPath(access: IamAccess | null | undefined, path: string): boolean {
	if (!access?.active) return false;
	const any = (p: Permission) => hasAnyEventPermission(access, p);
	if (path === '/admin') return true;
	if (path === '/admin/equipe') return hasPermission(access, 'users.read') || hasPermission(access, 'roles.read');
	if (path === '/admin/dashboard') return any('dashboard.read') && any('finance.read');
	if (path === '/admin/eventos/novo') return hasPermission(access, 'events.create');
	if (path === '/admin/eventos') return any('events.read');
	const match = path.match(
		/^\/admin\/eventos\/([^/]+)(?:\/(editar|pagina|previa|configuracoes|participantes|inscricoes))?$/,
	);
	if (match) {
		const action: Permission =
			match[2] === 'editar' || match[2] === 'configuracoes'
				? 'events.update'
				: match[2] === 'pagina'
					? 'event_pages.update'
					: match[2] === 'participantes' || match[2] === 'inscricoes'
						? 'participants.read'
						: 'events.read';

		return hasPermission(access, action, match[1]);
	}
	if (/^\/admin\/participantes(?:\/[^/]+)?$/.test(path)) return any('participants.read');
	if (path === '/admin/financeiro') return any('finance.read');
	if (path === '/admin/financeiro/recebimento') return access.isOwner;
	if (path === '/admin/analises') return any('reports.read') && any('finance.read');
	if (path === '/admin/configuracoes') return hasPermission(access, 'organization.read');

	return false;
}
export function preferredAdminPath(access: IamAccess | null | undefined) {
	if (!access?.active) return '/perfil';
	if (canVisitAdminPath(access, '/admin/dashboard')) return '/admin/dashboard';
	if (
		hasAnyEventPermission(access, 'checkin.execute') &&
		!hasAnyEventPermission(access, 'events.update') &&
		canVisitAdminPath(access, '/admin/participantes')
	)
		return '/admin/participantes';

	return (
		['/admin/eventos', '/admin/participantes', '/admin/equipe', '/admin/financeiro', '/admin/configuracoes'].find(
			(path) => canVisitAdminPath(access, path),
		) ?? '/perfil'
	);
}
export function canDelegateRole(access: IamAccess | null | undefined, role: IamRole, eventId: string | null) {
	if (role.key === 'owner' || (role.organization_id && role.organization_id !== access?.organizationId)) return false;
	const applicable = role.permissions.filter(
		(key) => !eventId || permissionDefinitions.find((p) => p.key === key)?.scope === 'event',
	);

	return applicable.length > 0 && applicable.every((p) => hasPermission(access, p, eventId));
}
