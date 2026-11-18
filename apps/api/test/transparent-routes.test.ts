import { expect, it } from 'vitest';
import { paymentRoutes } from '../src/routes/payments.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';
import {
	buildRouteTestApp,
	createSupabaseClientsStub,
	createTestEnv,
	sessionCookie,
	TEST_USER_ID,
} from './support/index.js';
import { event, cart } from './support/transparent-fixtures.js';
async function setup(authenticated = true, attempt: unknown = null, profile: Record<string, unknown> = {}) {
	return buildRouteTestApp(paymentRoutes, {
		env: createTestEnv(),
		payments: new MockPaymentGateway(),
		clients: createSupabaseClientsStub({
			user: authenticated ? { id: TEST_USER_ID, email: cart.participantInfo.email } : null,
			tables: {
				profiles: {
					data: {
						id: TEST_USER_ID,
						first_name: 'Ana',
						phone: '11999999999',
						document: '52998224725',
						status: 'active',
						role: 'user',
						...profile,
					},
				},
				events: { data: event },
				event_configurations: { data: { platform_fee_percentage: 0 } },
				checkout_attempts: { data: attempt },
			},
			rpc: { data: true },
		}).clients,
	});
}
it('quotes from the server without disclosing secret keys', async () => {
	const app = await setup();
	const res = await app.inject({
		method: 'POST',
		url: '/api/payments/checkout/quote',
		headers: sessionCookie(),
		payload: cart,
	});
	expect(res.statusCode).toBe(200);
	expect(res.json()).toMatchObject({ amountInCents: 10000, publicKey: null });
	expect(res.body).not.toContain('service_role');
	await app.close();
});

it.each([
	{ name: 'Outra Pessoa' },
	{ email: 'outra@example.test' },
	{ phone: '21999999999' },
	{ document: '11144477735' },
])('rejects changes to the authenticated buyer in every checkout endpoint: %j', async (changed) => {
	const app = await setup();
	const buyer = { ...cart.participantInfo, phone: '11999999999', document: '52998224725', ...changed };
	for (const [url, payload] of [
		['/api/payments/checkout/quote', { ...cart, participantInfo: buyer }],
		[
			'/api/payments/checkout',
			{ ...cart, participantInfo: buyer, requestId: TEST_USER_ID, expectedAmountInCents: 10000 },
		],
		[
			'/api/checkout/installments',
			{
				ticket_id: cart.tickets[0].ticketId,
				quantity: 1,
				installments: 2,
				participant_name: buyer.name,
				participant_email: buyer.email,
				participant_phone: buyer.phone,
				participant_document: buyer.document,
			},
		],
	] as const) {
		const res = await app.inject({ method: 'POST', url, headers: sessionCookie(), payload });
		expect(res.statusCode).toBe(422);
		expect(res.json().title).toBe('CHECKOUT_BUYER_MISMATCH');
	}
	await app.close();
});
it.each(['/api/payments/checkout/quote', '/api/payments/checkout', '/api/checkout/installments'])(
	'requires authentication on %s',
	async (url) => {
		const app = await setup(false);
		expect((await app.inject({ method: 'POST', url, payload: cart })).statusCode).toBe(401);
		await app.close();
	},
);

it('asks the buyer to complete their profile instead of accepting a name supplied by checkout', async () => {
	const app = await setup(true, null, { first_name: null, last_name: null });
	const res = await app.inject({
		method: 'POST',
		url: '/api/payments/checkout/quote',
		headers: sessionCookie(),
		payload: cart,
	});
	expect(res.statusCode).toBe(422);
	expect(res.json().title).toBe('CHECKOUT_PROFILE_INCOMPLETE');
	await app.close();
});

it('rejects an incomplete attendee list in Pix installments', async () => {
	const app = await setup();
	const res = await app.inject({
		method: 'POST',
		url: '/api/checkout/installments',
		headers: sessionCookie(),
		payload: {
			ticket_id: cart.tickets[0].ticketId,
			quantity: 2,
			installments: 2,
			participant_name: cart.participantInfo.name,
			participant_email: cart.participantInfo.email,
			attendees: [null],
		},
	});
	expect(res.statusCode).toBe(422);
	expect(res.json().context.errors.fieldErrors.attendees).toContain('Informe um participante por ingresso.');
	await app.close();
});
it('validates quote input and rejects card numbers or server-controlled values', async () => {
	const app = await setup();
	for (const payload of [
		{ ...cart, eventId: 'invalid' },
		{ ...cart, cardNumber: '4242424242424242' },
		{ ...cart, amount: 1 },
	])
		expect(
			(await app.inject({ method: 'POST', url: '/api/payments/checkout/quote', headers: sessionCookie(), payload }))
				.statusCode,
		).toBe(422);
	await app.close();
});
it('requires an authenticated owner and valid attempt id for status', async () => {
	const app = await setup();
	expect((await app.inject({ url: '/api/payments/attempts/invalid', headers: sessionCookie() })).statusCode).toBe(422);
	expect(
		(await app.inject({ url: '/api/payments/attempts/00000000-0000-4000-8000-000000000003', headers: sessionCookie() }))
			.statusCode,
	).toBe(404);
	await app.close();
});

it('returns a confirmed purchase to its authenticated buyer', async () => {
	const id = '00000000-0000-4000-8000-000000000003';
	const app = await setup(true, {
		id,
		user_id: TEST_USER_ID,
		status: 'confirmed',
		registration_ids: ['registration'],
		charge: null,
		confirmation_url: null,
		error_message: null,
	});
	const res = await app.inject({ url: `/api/payments/attempts/${id}`, headers: sessionCookie() });
	expect(res.statusCode).toBe(200);
	expect(res.json()).toMatchObject({ attemptId: id, status: 'confirmed', registrationId: 'registration' });
	await app.close();
	const anonymous = await setup(false);
	expect((await anonymous.inject({ url: `/api/payments/attempts/${id}` })).statusCode).toBe(401);
	await anonymous.close();
});
