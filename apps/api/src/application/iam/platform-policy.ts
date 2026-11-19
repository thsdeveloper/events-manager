import type { PlatformPermission } from '@events-manager/contracts';
type Policy = PlatformPermission[] | 'member' | 'deny' | null;
export function platformRoutePolicy(
	method: string,
	route: string,
	input: unknown = {},
	queryInput: unknown = {},
): Policy {
	if (!route.startsWith('/api/super-admin/')) return null;
	const verb = method === 'HEAD' ? 'GET' : method;
	const body = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
	const query = queryInput && typeof queryInput === 'object' ? (queryInput as Record<string, unknown>) : {};
	const read = verb === 'GET';
	const action = (resource: string, suffix = read ? 'read' : 'update') => [
		`platform_${resource}.${suffix}` as PlatformPermission,
	];
	const path = route.slice('/api/super-admin/'.length);
	if (path === 'overview' && read) return ['platform_overview.read', 'platform_finance.read'];
	if (path === 'iam/access' && read) return 'member';
	if (path === 'iam/permissions' && read) return action('roles', 'read');
	if (path === 'iam/audit' && read) return action('audit', 'read');
	if (/^iam\/members(?:\/:id)?$/.test(path))
		return action('users', read ? 'read' : verb === 'DELETE' ? 'remove' : 'update');
	if (/^iam\/roles(?:\/:id)?$/.test(path))
		return action('roles', read ? 'read' : verb === 'POST' ? 'create' : verb === 'DELETE' ? 'delete' : 'update');
	if (/^iam\/invitations(?:\/:id(?:\/resend)?)?$/.test(path)) return action('users', read ? 'read' : 'invite');
	if (path === 'organizers' && read) return action('organizers');
	if (/^organizers\/:id(?:\/status|\/notes)?$/.test(path)) return action('organizers');
	if (path === 'organizers/:id/records' && read)
		return [
			'platform_organizers.read',
			...(['transactions', 'payouts'].includes(String(query.kind)) ? ['platform_finance.read' as const] : []),
		];
	if (/^organizers\/:id\/receiving-account(?:\/documents\/:documentId)?$/.test(path) && read)
		return action('receiving');
	if (path === 'organizers/:id/receiving-account/:requestId/review' && verb === 'POST')
		return action('receiving', 'review');
	if (/^organizers\/:id\/manual-payouts(?:\/:payoutId\/receipt)?$/.test(path) && read) return action('finance');
	if (/^finance\/(?:transactions|payouts)$/.test(path))
		return read
			? action('finance')
			: path === 'finance/payouts' && verb === 'POST'
				? action('payouts', 'execute')
				: 'deny';
	if (/^finance\/payouts\/:id\/(?:receipt|complete|cancel)$/.test(path) && verb === 'POST')
		return action('payouts', 'execute');
	if (path === 'settings/payments') return action('settings');
	if (path === 'settings/branding' || path === 'settings/branding/assets') return action('branding');
	if (/^categories(?:\/:id)?$/.test(path)) return action('categories');
	if (path === 'cms/overview' && read) return action('content');
	const cms = path.match(/^cms\/(pages|posts|navigation|forms|redirects|media|site)(.*)$/);
	if (cms) {
		const [, resource, suffix] = cms;
		const allowed: Record<string, RegExp> = {
			pages: /^(?:\/:id(?:\/preview|\/activity|\/blocks(?:\/order|\/:blockId)?)?)?$/,
			posts: /^(?:\/:id)?$/,
			navigation: /^(?:\/:id(?:\/items(?:\/order|\/:itemId)?)?)?$/,
			forms: /^(?:\/:id(?:\/submissions)?)?$/,
			redirects: /^(?:\/:id)?$/,
			media: /^(?:\/:id)?$/,
			site: /^$/,
		};
		if (!allowed[resource].test(suffix)) return 'deny';
		if (read || (resource === 'pages' && suffix === '/:id/preview' && verb === 'POST')) return action(resource, 'read');
		const permissions = action(resource, 'update');
		const creatingDraft =
			verb === 'POST' &&
			suffix === '' &&
			(body.status === undefined || body.status === 'draft') &&
			(body.published_at === undefined || body.published_at === null);
		if (
			['pages', 'posts'].includes(resource) &&
			!creatingDraft &&
			(Object.hasOwn(body, 'status') || Object.hasOwn(body, 'published_at'))
		)
			permissions.push(`platform_${resource}.publish` as PlatformPermission);
		return permissions;
	}
	return 'deny';
}
