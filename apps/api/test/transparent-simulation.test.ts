import { afterEach, expect, it, vi } from 'vitest';
import type { FastifyInstance } from 'fastify';
import type { ApiEnv } from '../src/config/env.js';
import type { TransparentAttempt } from '../src/application/payments/transparent-checkout-service.js';
import type { PaymentGateway, TransparentCharge } from '../src/application/payments/payment-gateway.js';
import { paymentRoutes } from '../src/routes/payments.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	partialMock,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';

const id = '00000000-0000-4000-8000-000000000009';
const url = `/api/payments/attempts/${id}/simulate-payment`;
const charge: TransparentCharge = {
	id: 'pix_char_test',
	method: 'PIX',
	status: 'PENDING',
	amountInCents: 800,
	devMode: true,
	providerFeeInCents: 80,
	receiptUrl: null,
	metadata: {},
	copyPasteCode: 'test-pix',
	qrCodeBase64: null,
	barcode: null,
	boletoUrl: null,
	expiresAt: null,
};
const attempt: TransparentAttempt = {
	id,
	user_id: TEST_USER_ID,
	fingerprint: 'cart',
	method: 'PIX',
	amount: 800,
	status: 'pending',
	registration_ids: [],
	provider_id: charge.id,
	charge,
	confirmation_url: null,
	error_message: null,
	created_at: '2026-11-19T10:00:00Z',
};
const apps: FastifyInstance[] = [];
afterEach(async () => {
	await Promise.all(apps.splice(0).map((app) => app.close()));
});
async function setup(
	options: {
		env?: Partial<ApiEnv>;
		provider?: PaymentGateway['provider'];
		authenticated?: boolean;
		attempt?: Partial<TransparentAttempt> | null;
		charge?: Partial<TransparentCharge>;
	} = {},
) {
	const current = options.attempt === null ? null : { ...attempt, ...options.attempt };
	const providerCharge = { ...charge, ...options.charge };
	let settled = false;
	const gateway = partialMock<PaymentGateway>({
		provider: options.provider ?? 'abacatepay',
		findTransparentCharge: vi.fn(async () => ({ ...providerCharge, status: settled ? 'PAID' : providerCharge.status })),
		simulateTransparentPixPayment: vi.fn(async () => {
			settled = true;
		}),
	});
	const stub = createSupabaseClientsStub({
		user: options.authenticated === false ? null : { id: TEST_USER_ID, email: 'buyer@example.test' },
		tables: {
			profiles: { data: { id: TEST_USER_ID, status: 'active', role: 'attendee' } },
			checkout_attempts: { data: current },
		},
		rpc: { data: true },
	});
	stub.rpc.mockImplementation(async (name, args) => {
		if (
			current &&
			name === 'settle_transparent_checkout' &&
			(args?.target_charge as TransparentCharge).status === 'PAID'
		) {
			current.status = 'confirmed';
			current.charge = args?.target_charge as TransparentCharge;
		}
		return { data: true, error: null };
	});
	const app = await buildRouteTestApp(paymentRoutes, {
		env: createTestEnv({
			APP_ENV: 'development',
			PAYMENTS_MODE: 'abacatepay',
			ABACATEPAY_API_KEY: 'abc_dev_test',
			...options.env,
		}),
		clients: stub.clients,
		payments: gateway,
	});
	apps.push(app);
	return { app, gateway, stub };
}

it('offers simulation for a pending sandbox Pix after loading an existing purchase', async () => {
	const { app } = await setup();
	const response = await app.inject({ url: `/api/payments/attempts/${id}`, headers: sessionCookie() });
	expect(response.statusCode).toBe(200);
	expect(response.json()).toMatchObject({ status: 'pending', canSimulatePayment: true });
});

it('simulates the buyer’s stored Pix and confirms it through provider reconciliation', async () => {
	const { app, gateway, stub } = await setup({ env: { NODE_ENV: 'production' } });
	const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
	expect(response.statusCode).toBe(200);
	expect(response.json()).toMatchObject({ attemptId: id, status: 'confirmed', canSimulatePayment: false });
	expect(gateway.simulateTransparentPixPayment).toHaveBeenCalledExactlyOnceWith(charge.id);
	expect(stub.rpc).toHaveBeenCalledWith(
		'settle_transparent_checkout',
		expect.objectContaining({
			target_attempt: id,
			target_charge: expect.objectContaining({ id: charge.id, status: 'PAID', devMode: true }),
		}),
	);
	expect(response.body).not.toContain('abc_dev_test');
});

it.each([
	{ env: { APP_ENV: 'production' as const, NODE_ENV: 'development' as const } },
	{ env: { ABACATEPAY_API_KEY: 'abc_live_test' } },
	{ env: { ABACATEPAY_API_KEY: undefined } },
	{ provider: 'mock' as const },
])('hides and rejects simulation outside the development sandbox: %j', async (options) => {
	const { app, gateway } = await setup(options);
	const status = await app.inject({ url: `/api/payments/attempts/${id}`, headers: sessionCookie() });
	expect(status.json().canSimulatePayment).toBe(false);
	const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
	expect(response.statusCode).toBe(403);
	expect(response.json().title).toBe('PAYMENT_SIMULATION_DISABLED');
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it('requires authentication to simulate a payment', async () => {
	const { app, gateway } = await setup({ authenticated: false });
	expect((await app.inject({ method: 'POST', url })).statusCode).toBe(401);
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it.each([
	{ url: url.replace(id, 'invalid') },
	{ url, payload: { providerId: 'another-charge', userId: TEST_USER_ID } },
])('validates simulation input before contacting the provider: %j', async (input) => {
	const { app, gateway } = await setup();
	const response = await app.inject({ method: 'POST', headers: sessionCookie(), ...input });
	expect(response.statusCode).toBe(422);
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it('does not simulate another buyer’s purchase', async () => {
	const { app, gateway } = await setup({ attempt: { user_id: 'another-buyer' } });
	const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
	expect(response.statusCode).toBe(404);
	expect(gateway.findTransparentCharge).not.toHaveBeenCalled();
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it('returns not found for a missing or inaccessible purchase', async () => {
	const { app, gateway } = await setup({ attempt: null });
	expect((await app.inject({ method: 'POST', url, headers: sessionCookie() })).statusCode).toBe(404);
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it('does not confirm the purchase before the provider reports payment', async () => {
	const { app, gateway } = await setup();
	vi.mocked(gateway.simulateTransparentPixPayment).mockResolvedValue(undefined);
	const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
	expect(response.statusCode).toBe(200);
	expect(response.json()).toMatchObject({ status: 'pending', canSimulatePayment: true });
});

it('preserves the pending purchase when simulation fails at the provider', async () => {
	const { app, gateway, stub } = await setup();
	vi.mocked(gateway.simulateTransparentPixPayment).mockRejectedValue(new Error('provider unavailable'));
	expect((await app.inject({ method: 'POST', url, headers: sessionCookie() })).statusCode).toBe(500);
	expect(stub.rpc.mock.calls.some(([name]) => name === 'settle_transparent_checkout')).toBe(false);
});

it('does not simulate a charge missing from the provider', async () => {
	const { app, gateway } = await setup();
	vi.mocked(gateway.findTransparentCharge).mockResolvedValue(null);
	expect((await app.inject({ method: 'POST', url, headers: sessionCookie() })).statusCode).toBe(404);
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it('limits simulation attempts before contacting the provider', async () => {
	const { app, gateway, stub } = await setup();
	stub.rpc.mockResolvedValue({ data: false, error: null });
	expect((await app.inject({ method: 'POST', url, headers: sessionCookie() })).statusCode).toBe(429);
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it.each(['BOLETO', 'CARD'] as const)(
	'confirms a %s locally in development and marks it as simulated',
	async (method) => {
		const { app, gateway, stub } = await setup({ attempt: { method }, charge: { method } });
		const status = await app.inject({ url: `/api/payments/attempts/${id}`, headers: sessionCookie() });
		expect(status.json().canSimulatePayment).toBe(true);
		const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({ status: 'confirmed', payment: { developmentSimulation: true } });
		expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
		expect(stub.rpc).toHaveBeenCalledWith(
			'settle_transparent_checkout',
			expect.objectContaining({
				target_event: 'development.simulated',
				target_charge: expect.objectContaining({
					developmentSimulation: true,
					providerFeeInCents: null,
					status: 'PAID',
					devMode: true,
					method,
				}),
			}),
		);
	},
);
it.each(['BOLETO', 'CARD'] as const)(
	'rejects local %s confirmation in production and for live charges',
	async (method) => {
		for (const options of [{ env: { APP_ENV: 'production' as const } }, { charge: { method, devMode: false } }]) {
			const { app, stub } = await setup({ attempt: { method }, charge: { method }, ...options });
			const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
			expect([403, 409]).toContain(response.statusCode);
			expect(stub.rpc.mock.calls.some(([name]) => name === 'settle_transparent_checkout')).toBe(false);
		}
	},
);

it.each([{ status: 'failed' }, { status: 'cancelled' }, { status: 'processing' }, { provider_id: null }] as const)(
	'rejects a purchase that is not pending: %j',
	async (overrides) => {
		const { app, gateway } = await setup({ attempt: overrides });
		const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
		expect(response.statusCode).toBe(409);
		expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
	},
);

it.each([
	{ devMode: false },
	{ amountInCents: 1 },
	{ id: 'another-charge' },
	{ method: 'CARD' as const },
	{ status: 'EXPIRED' },
])('verifies the actual provider charge before simulation: %j', async (overrides) => {
	const { app, gateway } = await setup({ charge: overrides });
	const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
	expect(response.statusCode).toBe(409);
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it('returns an already confirmed purchase without simulating again', async () => {
	const { app, gateway } = await setup({ attempt: { status: 'confirmed' } });
	const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
	expect(response.statusCode).toBe(200);
	expect(response.json()).toMatchObject({ status: 'confirmed', canSimulatePayment: false });
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});

it('reconciles a Pix already paid at the provider without simulating again', async () => {
	const { app, gateway } = await setup({ charge: { status: 'PAID' } });
	const response = await app.inject({ method: 'POST', url, headers: sessionCookie() });
	expect(response.statusCode).toBe(200);
	expect(response.json().status).toBe('confirmed');
	expect(gateway.simulateTransparentPixPayment).not.toHaveBeenCalled();
});
