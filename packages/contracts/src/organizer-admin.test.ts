import { describe, expect, it } from 'vitest';
import { organizerAdminQuerySchema, organizerAdminUpdateSchema } from './organizer-admin.js';
const reason = 'Conferência solicitada pelo responsável';
describe('organizer administration contracts', () => {
	it.each([
		{},
		{ status: 'active' },
		{ status: 'deleted', reason },
		{ name: 'A', reason },
		{ email: 'bad', reason },
		{ user_id: 'another-user', reason },
		{ reason },
		{ payout_status: 'enabled', reason },
	])('rejects an unsafe or empty patch: %j', (input) => {
		expect(organizerAdminUpdateSchema.safeParse(input).success).toBe(false);
	});
	it.each([
		{ payout_pix_key: 'ana@example.com', payout_pix_key_type: 'EMAIL' },
		{ payout_pix_key: null, payout_pix_key_type: null },
		{ payout_status: 'enabled', reviewed_pix_key: 'ana@example.com' },
		{ bank_account: { account_number: '1234' } },
	])('prevents super-admin from defining receiving details: %j', (input) => {
		expect(organizerAdminUpdateSchema.safeParse({ ...input, reason }).success).toBe(false);
	});
	it('accepts account status and contact corrections with a reason', () => {
		expect(
			organizerAdminUpdateSchema.safeParse({ name: 'Produtora A', email: 'a@b.com', status: 'active', reason }).success,
		).toBe(true);
	});
	it('bounds pagination and sorting before database access', () => {
		expect(organizerAdminQuerySchema.safeParse({ limit: 1000 }).success).toBe(false);
		expect(organizerAdminQuerySchema.safeParse({ sort: 'provider_secret' }).success).toBe(false);
		expect(organizerAdminQuerySchema.parse({})).toMatchObject({
			page: 1,
			limit: 20,
			sort: 'date_created',
			direction: 'desc',
		});
	});
});

it('normalizes formatted fiscal document searches without changing organizer names', () => {
	expect(organizerAdminQuerySchema.parse({ search: '45.723.174/0001-10' }).search).toBe('45723174000110');
	expect(organizerAdminQuerySchema.parse({ search: '  Produtora 123  ' }).search).toBe('Produtora 123');
});
