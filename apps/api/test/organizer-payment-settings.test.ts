import { describe, expect, it } from 'vitest';
import { organizerRoutes } from '../src/routes/organizers.js';
import type { ApiEnv } from '../src/config/env.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
	TEST_ORGANIZER_ID,
} from './support/index.js';

const organizer = { id: TEST_ORGANIZER_ID, user_id: TEST_USER_ID, status: 'active' };
async function setup(
	options: {
		authenticated?: boolean;
		owns?: boolean;
		preferences?: Record<string, unknown>;
		env?: Partial<ApiEnv>;
	} = {},
) {
	const stub = createSupabaseClientsStub({
		user: options.authenticated === false ? null : { id: TEST_USER_ID, email: 'owner@example.test' },
		tables: {
			profiles: { data: { id: TEST_USER_ID, role: 'organizer', status: 'active' } },
			organizers: [
				{ data: options.owns === false ? [] : [organizer] },
				{ data: { ...organizer, ...options.preferences } },
			],
			event_configurations: { data: { gateway_card_settlement_period: 'D+1' } },
		},
	});
	const app = await buildRouteTestApp(organizerRoutes, {
		env: createTestEnv({ APP_ENV: 'production', ABACATEPAY_METHODS: ['PIX', 'CARD', 'BOLETO'], ...options.env }),
		clients: stub.clients,
	});
	return { app, ...stub };
}

describe('organization payment preferences', () => {
	it('defaults an unconfigured organization to Pix only', async () => {
		const { app } = await setup();
		const response = await app.inject({
			method: 'GET',
			url: '/api/organizer/payment-settings',
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			settings: { accepted_payment_methods: ['PIX'], credit_card_settlement_period: null },
			available_methods: ['PIX'],
		});
		await app.close();
	});
	it('saves a credit preference while marking the incompatible settlement as pending', async () => {
		const preferences = { accepted_payment_methods: ['PIX', 'CARD', 'BOLETO'], credit_card_settlement_period: 'D+7' };
		const { app } = await setup({ preferences });
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/organizer/payment-settings',
			headers: sessionCookie(),
			payload: preferences,
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			settings: preferences,
			available_methods: ['PIX', 'BOLETO'],
			pending_methods: [{ method: 'CARD', reason: 'settlement' }],
		});
		await app.close();
	});
	it('permits credit only when both the store and settlement are compatible', async () => {
		const preferences = { accepted_payment_methods: ['CARD'], credit_card_settlement_period: 'D+1' };
		const { app } = await setup({ preferences });
		const response = await app.inject({
			method: 'GET',
			url: '/api/organizer/payment-settings',
			headers: sessionCookie(),
		});
		expect(response.json()).toMatchObject({ available_methods: ['CARD'], pending_methods: [] });
		await app.close();
	});
	it.each(['GET', 'PATCH'] as const)('%s requires an authenticated owner', async (method) => {
		for (const options of [{ authenticated: false }, { owns: false }]) {
			const { app } = await setup(options);
			const response = await app.inject({
				method,
				url: '/api/organizer/payment-settings',
				headers: sessionCookie(),
				...(method === 'PATCH' ? { payload: { accepted_payment_methods: ['PIX'] } } : {}),
			});
			expect(response.statusCode).toBe(options.authenticated === false ? 401 : 403);
			await app.close();
		}
	});
	it.each([
		{ accepted_payment_methods: [] },
		{ accepted_payment_methods: ['CARD'] },
		{ accepted_payment_methods: ['PIX'], organizer_id: 'another-owner' },
	])('rejects invalid or foreign-owner payloads: %j', async (payload) => {
		const { app } = await setup();
		const response = await app.inject({
			method: 'PATCH',
			url: '/api/organizer/payment-settings',
			headers: sessionCookie(),
			payload,
		});
		expect(response.statusCode).toBe(422);
		await app.close();
	});
});

it.each([
	['development', 'abc_dev_test', 'pk_test', ['PIX', 'CARD'], true],
	['production', 'abc_live_test', 'pk_test', ['PIX'], false],
	['development', 'abc_live_test', 'pk_test', ['PIX'], false],
	['development', 'abc_dev_test', undefined, ['PIX'], true],
] as const)(
	'reports the same card availability as checkout for %s and %s',
	async (stage, secret, publicKey, expected, testMode) => {
		const preferences = { accepted_payment_methods: ['PIX', 'CARD', 'DEBIT'], credit_card_settlement_period: 'D+30' };
		const { app } = await setup({
			preferences,
			env: {
				APP_ENV: stage,
				PAYMENTS_MODE: 'abacatepay',
				ABACATEPAY_API_KEY: secret,
				ABACATEPAY_PUBLIC_KEY: publicKey,
			},
		});
		const response = await app.inject({
			method: 'GET',
			url: '/api/organizer/payment-settings',
			headers: sessionCookie(),
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ settings: preferences, available_methods: expected, test_mode: testMode });
		expect(response.json().pending_methods).toContainEqual({ method: 'DEBIT', reason: 'integration' });
		await app.close();
	},
);
