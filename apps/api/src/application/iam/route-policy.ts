import type { Permission } from '@events-manager/contracts';
export type RoutePolicy =
	| {
			actions: Permission[];
			scope: 'organization' | 'list' | 'event';
			parameter?: string;
			bodyField?: string;
			resource?: 'event_tickets' | 'registration_tickets';
	  }
	| 'member'
	| 'deny'
	| null;
export function organizationRoutePolicy(method: string, route: string, input: unknown = {}): RoutePolicy {
	const body = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
	const org = (...actions: Permission[]): RoutePolicy => ({ actions, scope: 'organization' });
	const list = (...actions: Permission[]): RoutePolicy => ({ actions, scope: 'list' });
	const event = (actions: Permission[], parameter = 'id'): RoutePolicy => ({ actions, scope: 'event', parameter });
	const verb = method === 'HEAD' ? 'GET' : method;
	if (['/api/events/public', '/api/events/slug/:slug', '/api/events/:eventId/coupons/apply'].includes(route))
		return null;
	// These routes already validate identity or legal ownership in their service.
	if (
		['/api/organizer/request', '/api/organizer/organizations', '/api/organizer/organizations/:id/activate'].includes(
			route,
		)
	)
		return null;
	if (
		/^\/api\/organizer\/receiving-accounts\/:id(?:\/documents(?:\/:documentId)?|\/payouts\/:payoutId\/receipt)?$/.test(
			route,
		)
	)
		return null;
	if (route.startsWith('/api/organizer/iam/')) {
		if (
			['access', 'members', 'invitations', 'roles', 'permissions', 'events', 'audit'].some(
				(name) => route === `/api/organizer/iam/${name}` || route === `/api/organizer/iam/${name}/:id`,
			) ||
			route === '/api/organizer/iam/invitations/:id/resend'
		)
			return 'member';
		return 'deny';
	}
	if (route === '/api/organizer/event-selection') return 'member';
	if (route === '/api/events') {
		if (verb === 'GET') return list('events.read');
		if (verb === 'POST')
			return org(
				'events.create',
				...(body.status === 'published' ? ['events.publish' as const] : []),
				...((Array.isArray(body.tickets) && body.tickets.length) ||
				(Array.isArray(body.ticket_groups) && body.ticket_groups.length)
					? ['tickets.create' as const]
					: []),
			);
	}
	if (route === '/api/events/:id')
		return event(
			verb === 'GET'
				? ['events.read']
				: verb === 'DELETE'
					? ['events.delete']
					: ['events.update', ...(Object.hasOwn(body, 'status') ? ['events.publish' as const] : [])],
		);
	if (['/api/event-drafts', '/api/event-drafts/:id'].includes(route)) return org('events.create');
	if (/^\/api\/events\/:id\/page(?:\/publish|\/unpublish)?$/.test(route))
		return event([verb === 'GET' ? 'event_pages.read' : verb === 'PUT' ? 'event_pages.update' : 'event_pages.publish']);
	if (['/api/events/:eventId/coupons', '/api/events/:eventId/coupons/:couponId'].includes(route))
		return event(
			[
				verb === 'GET'
					? 'coupons.read'
					: verb === 'POST'
						? 'coupons.create'
						: verb === 'DELETE'
							? 'coupons.delete'
							: 'coupons.update',
			],
			'eventId',
		);
	if (route === '/api/admin/dashboard') return list('dashboard.read', 'finance.read');
	if (route === '/api/admin/event-configurations') return list('events.read');
	if (['/api/admin/ingressos/filter-options', '/api/admin/ingressos'].includes(route)) {
		if (verb === 'GET') return list('tickets.read');
		if (verb === 'POST' && route === '/api/admin/ingressos')
			return { actions: ['tickets.create'], scope: 'event', bodyField: 'event_id' };
	}
	if (['/api/admin/ingressos/:id', '/api/admin/ingressos/:id/duplicate'].includes(route))
		return {
			actions: [
				route.endsWith('/duplicate') ? 'tickets.create' : verb === 'DELETE' ? 'tickets.delete' : 'tickets.update',
			],
			scope: 'event',
			resource: 'event_tickets',
			parameter: 'id',
		};
	if (/^\/api\/admin\/eventos\/:eventId\/grupos(?:\/:id)?$/.test(route))
		return event(
			[
				verb === 'GET'
					? 'tickets.read'
					: verb === 'POST'
						? 'tickets.create'
						: verb === 'DELETE'
							? 'tickets.delete'
							: 'tickets.update',
			],
			'eventId',
		);
	if (route === '/api/admin/eventos/:eventId/ingressos/ordem') return event(['tickets.update'], 'eventId');
	if (['/api/admin/participantes', '/api/admin/participantes/filter-options'].includes(route))
		return list('participants.read');
	if (route === '/api/admin/participantes/export') return list('participants.read', 'participants.export');
	if (/^\/api\/admin\/participantes\/:id(?:\/edit|\/checkin|\/cancel|\/resend-email)?$/.test(route)) {
		const actions: Permission[] = route.endsWith('/checkin')
			? [verb === 'DELETE' ? 'checkin.undo' : 'checkin.execute']
			: route.endsWith('/cancel')
				? ['participants.cancel', ...(body.refund === true ? ['refunds.create' as const] : [])]
				: route.endsWith('/edit') || route.endsWith('/resend-email')
					? ['participants.update']
					: ['participants.read'];
		return { actions, scope: 'event', resource: 'registration_tickets', parameter: 'id' };
	}
	if (route === '/api/organizer/finance/payouts') return org('payouts.read');
	if (
		[
			'/api/organizer/finance/events',
			'/api/organizer/finance/overview',
			'/api/organizer/finance/transactions',
			'/api/organizer/finance/transactions/:id',
		].includes(route)
	)
		return list('finance.read');
	if (route === '/api/organizer/finance/export') return list('finance.read', 'finance.export');
	if (route === '/api/organizer/analytics') return list('finance.read', 'reports.read');
	if (route === '/api/organizer/stats') return org('dashboard.read', 'finance.read');
	if (route === '/api/organizer/profile') return org(verb === 'GET' ? 'organization.read' : 'organization.update');
	if (route === '/api/organizer/logo') return org('organization.update');
	if (route === '/api/organizer/payment-settings')
		return org(verb === 'GET' ? 'organization.read' : 'payments.configure');
	if (route === '/api/organizer/payout-settings') return org('organization.update');
	if (['/api/ai/generate-cover', '/api/ai/generate-description'].includes(route)) return org('events.create');
	if (/^\/api\/(?:admin|organizer|events|event-drafts)(?:\/|$)/.test(route)) return 'deny';
	return null;
}
