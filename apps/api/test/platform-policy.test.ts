import { describe, expect, it } from 'vitest';
import { platformRoutePolicy } from '../src/application/iam/platform-policy.js';
describe('platform route permissions', () => {
	it.each([
		['GET', '/api/super-admin/overview', ['platform_overview.read', 'platform_finance.read']],
		['GET', '/api/super-admin/organizers', ['platform_organizers.read']],
		['PATCH', '/api/super-admin/organizers/:id', ['platform_organizers.update']],
		['GET', '/api/super-admin/organizers/:id/receiving-account', ['platform_receiving.read']],
		['POST', '/api/super-admin/organizers/:id/receiving-account/:requestId/review', ['platform_receiving.review']],
		['POST', '/api/super-admin/finance/payouts', ['platform_payouts.execute']],
		['GET', '/api/super-admin/finance/payouts', ['platform_finance.read']],
		['POST', '/api/super-admin/finance/payouts/:id/complete', ['platform_payouts.execute']],
		['GET', '/api/super-admin/settings/payments', ['platform_settings.read']],
		['PATCH', '/api/super-admin/settings/payments', ['platform_settings.update']],
		['GET', '/api/super-admin/cms/pages', ['platform_pages.read']],
		['POST', '/api/super-admin/cms/pages/:id/preview', ['platform_pages.read']],
		['PATCH', '/api/super-admin/cms/pages/:id/blocks/:blockId', ['platform_pages.update']],
		['POST', '/api/super-admin/cms/forms', ['platform_forms.update']],
		['GET', '/api/super-admin/cms/forms/:id/submissions', ['platform_forms.read']],
		['GET', '/api/super-admin/iam/members', ['platform_users.read']],
		['PATCH', '/api/super-admin/iam/members/:id', ['platform_users.update']],
	] as const)('%s %s requires its exact permission', (method, path, expected) =>
		expect(platformRoutePolicy(method, path)).toEqual(expected),
	);
	it('requires publication authority for status changes', () =>
		expect(platformRoutePolicy('PATCH', '/api/super-admin/cms/pages/:id', { status: 'draft' })).toEqual([
			'platform_pages.update',
			'platform_pages.publish',
		]));
	it('requires finance authority for organizer financial records', () =>
		expect(platformRoutePolicy('GET', '/api/super-admin/organizers/:id/records', {}, { kind: 'transactions' })).toEqual(
			['platform_organizers.read', 'platform_finance.read'],
		));
	it('denies unknown platform endpoints even for roots', () =>
		expect(platformRoutePolicy('GET', '/api/super-admin/new-secret')).toBe('deny'));
	it('leaves organization and public endpoints to their authorization', () =>
		expect(platformRoutePolicy('GET', '/api/organizer/iam/access')).toBeNull());
});

it('requires publishing permission for scheduling as well as status transitions', () => {
	expect(platformRoutePolicy('PATCH', '/api/super-admin/cms/pages/:id', { published_at: '2026-12-01' })).toContain(
		'platform_pages.publish',
	);
	expect(platformRoutePolicy('PATCH', '/api/super-admin/cms/posts/:id', { published_at: null })).toContain(
		'platform_posts.publish',
	);
});

it('allows creating a draft without publication permission while guarding published content', () => {
	for (const resource of ['pages', 'posts']) {
		expect(
			platformRoutePolicy('POST', `/api/super-admin/cms/${resource}`, { status: 'draft', published_at: null }),
		).toEqual([`platform_${resource}.update`]);
		expect(
			platformRoutePolicy('POST', `/api/super-admin/cms/${resource}`, { status: 'published', published_at: null }),
		).toContain(`platform_${resource}.publish`);
	}
});
