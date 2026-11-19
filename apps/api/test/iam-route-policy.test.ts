import { describe, expect, it } from 'vitest';
import { organizationRoutePolicy as policy } from '../src/application/iam/route-policy.js';
describe('organization route authorization catalog', () => {
	it('denies new unmapped administrative endpoints by default', () => {
		expect(policy('POST', '/api/admin/new-feature')).toBe('deny');
		expect(policy('GET', '/api/organizer/unknown')).toBe('deny');
	});
	it('keeps public checkout and event discovery outside team permissions', () => {
		expect(policy('GET', '/api/events/public')).toBeNull();
		expect(policy('GET', '/api/events/slug/:slug')).toBeNull();
		expect(policy('POST', '/api/events/:eventId/coupons/apply')).toBeNull();
		expect(policy('POST', '/api/payments/checkout')).toBeNull();
	});
	it('binds check-in to the ticket resource and requires extra authority to refund', () => {
		expect(policy('POST', '/api/admin/participantes/:id/checkin')).toMatchObject({
			actions: ['checkin.execute'],
			scope: 'event',
			resource: 'registration_tickets',
		});
		expect(policy('POST', '/api/admin/participantes/:id/cancel', { refund: true })).toMatchObject({
			actions: ['participants.cancel', 'refunds.create'],
		});
	});
	it('requires publication and ticket creation permissions for combined event creation', () => {
		expect(policy('POST', '/api/events', { status: 'published', tickets: [{ title: 'VIP' }] })).toMatchObject({
			actions: ['events.create', 'events.publish', 'tickets.create'],
			scope: 'organization',
		});
	});
	it('does not use the selected event cookie as the resource identity', () => {
		expect(policy('PATCH', '/api/events/:id')).toMatchObject({
			actions: ['events.update'],
			parameter: 'id',
			scope: 'event',
		});
		expect(policy('POST', '/api/admin/ingressos')).toMatchObject({
			actions: ['tickets.create'],
			bodyField: 'event_id',
		});
	});
});

describe('permissions required by existing operations', () => {
	it.each([
		['HEAD', '/api/events', 'events.read', 'list'],
		['POST', '/api/events', 'events.create', 'organization'],
		['GET', '/api/events/:id', 'events.read', 'event'],
		['DELETE', '/api/events/:id', 'events.delete', 'event'],
		['PATCH', '/api/events/:id', 'events.update', 'event'],
		['GET', '/api/event-drafts', 'events.create', 'organization'],
		['PATCH', '/api/event-drafts/:id', 'events.create', 'organization'],
		['GET', '/api/events/:id/page', 'event_pages.read', 'event'],
		['PUT', '/api/events/:id/page', 'event_pages.update', 'event'],
		['POST', '/api/events/:id/page/publish', 'event_pages.publish', 'event'],
		['POST', '/api/events/:id/page/unpublish', 'event_pages.publish', 'event'],
		['GET', '/api/events/:eventId/coupons', 'coupons.read', 'event'],
		['POST', '/api/events/:eventId/coupons', 'coupons.create', 'event'],
		['PATCH', '/api/events/:eventId/coupons/:couponId', 'coupons.update', 'event'],
		['DELETE', '/api/events/:eventId/coupons/:couponId', 'coupons.delete', 'event'],
		['GET', '/api/admin/dashboard', 'dashboard.read', 'list'],
		['GET', '/api/admin/event-configurations', 'events.read', 'list'],
		['GET', '/api/admin/ingressos/filter-options', 'tickets.read', 'list'],
		['GET', '/api/admin/ingressos', 'tickets.read', 'list'],
		['PATCH', '/api/admin/ingressos/:id', 'tickets.update', 'event'],
		['DELETE', '/api/admin/ingressos/:id', 'tickets.delete', 'event'],
		['POST', '/api/admin/ingressos/:id/duplicate', 'tickets.create', 'event'],
		['GET', '/api/admin/eventos/:eventId/grupos', 'tickets.read', 'event'],
		['POST', '/api/admin/eventos/:eventId/grupos', 'tickets.create', 'event'],
		['PATCH', '/api/admin/eventos/:eventId/grupos/:id', 'tickets.update', 'event'],
		['DELETE', '/api/admin/eventos/:eventId/grupos/:id', 'tickets.delete', 'event'],
		['PUT', '/api/admin/eventos/:eventId/ingressos/ordem', 'tickets.update', 'event'],
		['GET', '/api/admin/participantes', 'participants.read', 'list'],
		['GET', '/api/admin/participantes/filter-options', 'participants.read', 'list'],
		['GET', '/api/admin/participantes/export', 'participants.export', 'list'],
		['GET', '/api/admin/participantes/:id', 'participants.read', 'event'],
		['PATCH', '/api/admin/participantes/:id/edit', 'participants.update', 'event'],
		['POST', '/api/admin/participantes/:id/resend-email', 'participants.update', 'event'],
		['DELETE', '/api/admin/participantes/:id/checkin', 'checkin.undo', 'event'],
		['POST', '/api/admin/participantes/:id/cancel', 'participants.cancel', 'event'],
		['GET', '/api/organizer/finance/payouts', 'payouts.read', 'organization'],
		['GET', '/api/organizer/finance/events', 'finance.read', 'list'],
		['GET', '/api/organizer/finance/transactions', 'finance.read', 'list'],
		['GET', '/api/organizer/finance/transactions/:id', 'finance.read', 'list'],
		['GET', '/api/organizer/finance/export', 'finance.export', 'list'],
		['GET', '/api/organizer/analytics', 'reports.read', 'list'],
		['GET', '/api/organizer/stats', 'finance.read', 'organization'],
		['GET', '/api/organizer/profile', 'organization.read', 'organization'],
		['PATCH', '/api/organizer/profile', 'organization.update', 'organization'],
		['DELETE', '/api/organizer/logo', 'organization.update', 'organization'],
		['GET', '/api/organizer/payment-settings', 'organization.read', 'organization'],
		['PATCH', '/api/organizer/payment-settings', 'payments.configure', 'organization'],
		['PATCH', '/api/organizer/payout-settings', 'organization.update', 'organization'],
		['POST', '/api/ai/generate-description', 'events.create', 'organization'],
	])('%s %s requires %s in its resource scope', (method, route, action, scope) => {
		expect(policy(method, route)).toMatchObject({ actions: expect.arrayContaining([action]), scope });
	});
	it('never allows a state-changing fallback for unsupported methods', () => {
		expect(policy('PUT', '/api/events')).toBe('deny');
		expect(policy('POST', '/api/admin/ingressos/filter-options')).toBe('deny');
	});
	it('requires ticket authority for embedded groups and publication authority for status changes', () => {
		expect(policy('POST', '/api/events', { ticket_groups: [{}] })).toMatchObject({
			actions: ['events.create', 'tickets.create'],
		});
		expect(policy('PATCH', '/api/events/:id', { status: 'published' })).toMatchObject({
			actions: ['events.update', 'events.publish'],
		});
		expect(policy('POST', '/api/events', { tickets: [], ticket_groups: [] })).toMatchObject({
			actions: ['events.create'],
		});
	});
	it('lets identity, owner verification and IAM services enforce their contextual checks', () => {
		for (const route of [
			'/api/organizer/request',
			'/api/organizer/organizations',
			'/api/organizer/organizations/:id/activate',
			'/api/organizer/receiving-accounts/:id',
			'/api/organizer/receiving-accounts/:id/documents/:documentId',
		])
			expect(policy('POST', route)).toBeNull();
		for (const route of [
			'/api/organizer/event-selection',
			'/api/organizer/iam/access',
			'/api/organizer/iam/roles/:id',
			'/api/organizer/iam/invitations/:id/resend',
		])
			expect(policy('GET', route)).toBe('member');
		expect(policy('GET', '/api/organizer/iam/unknown')).toBe('deny');
	});
});

describe('event status authority', () => {
	it.each(['published', 'draft', 'cancelled', 'archived'])(
		'requires publication authority to change an existing event to %s',
		(status) => {
			expect(policy('PATCH', '/api/events/:id', { status })).toMatchObject({
				actions: ['events.update', 'events.publish'],
			});
		},
	);
	it('leaves invalid request bodies to HTTP schema validation without throwing', () => {
		expect(policy('POST', '/api/events', null as never)).toMatchObject({ actions: ['events.create'] });
	});
});
