import { afterEach, expect, it, vi } from 'vitest';
import { AbacatePayGateway } from '../src/infrastructure/payments/abacatepay-gateway.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';
const customer = { name: 'Ana Silva', email: 'ana@example.test', taxId: '52998224725', cellphone: '11999999999' };
const input = {
	externalId: 'attempt-1',
	amountInCents: 10000,
	description: 'Ingresso',
	customer,
	metadata: { checkout_attempt_id: 'attempt-1' },
	installments: 2,
};
afterEach(() => vi.unstubAllGlobals());
it('simulates a sandbox Pix through the provider endpoint without sending local payment state', async () => {
	const fetcher = vi.fn().mockResolvedValue(Response.json({ success: true, data: { id: 'pix_test', status: 'PAID' } }));
	vi.stubGlobal('fetch', fetcher);
	await new AbacatePayGateway('abc_dev_test').simulateTransparentPixPayment('pix_test');
	expect(fetcher).toHaveBeenCalledExactlyOnceWith(
		'https://api.abacatepay.com/v2/transparents/simulate-payment?id=pix_test',
		expect.objectContaining({
			method: 'POST',
			body: '{}',
			headers: expect.objectContaining({ Authorization: 'Bearer abc_dev_test' }),
		}),
	);
});
it('rejects simulation with a live key before contacting the provider', async () => {
	const fetcher = vi.fn();
	vi.stubGlobal('fetch', fetcher);
	await expect(new AbacatePayGateway('abc_live_test').simulateTransparentPixPayment('pix_test')).rejects.toMatchObject({
		code: 'PAYMENT_SIMULATION_DISABLED',
	});
	expect(fetcher).not.toHaveBeenCalled();
});
it('does not simulate mock charges that are already confirmed automatically', async () => {
	await expect(new MockPaymentGateway().simulateTransparentPixPayment('mock_test')).rejects.toMatchObject({
		code: 'PAYMENT_SIMULATION_DISABLED',
	});
});
it('normalizes event titles containing emoji and typographic punctuation accepted by the event editor', async () => {
	const fetcher = vi.fn().mockImplementation(async (_url, options) => {
		const description = JSON.parse(options.body).data.description;
		if (/[^A-Za-z0-9 .-]/.test(description))
			return Response.json({ success: false, error: 'Disallowed character in description' }, { status: 400 });
		return Response.json({ success: true, data: { id: 'pix_1', status: 'PENDING', amount: 10000, devMode: true } });
	});
	vi.stubGlobal('fetch', fetcher);
	await expect(
		new AbacatePayGateway('abc_dev_test').createTransparentCharge({
			...input,
			method: 'PIX',
			description: 'Imersão — inovação 🚀',
		}),
	).resolves.toMatchObject({ status: 'PENDING' });
});
it.each(['PIX', 'BOLETO', 'CARD'] as const)(
	'creates %s transparently with the exact server amount and safe output',
	async (method) => {
		const fetcher = vi.fn().mockResolvedValue(
			Response.json({
				success: true,
				data: {
					id: 'charge_1',
					status: method === 'CARD' ? 'APPROVED' : 'PENDING',
					amount: 10000,
					devMode: true,
					platformFee: 80,
					brCode: 'pix-code',
					brCodeBase64: 'data:image/png;base64,aGVsbG8=',
					identificationNumber: '123',
					url: 'https://app.abacatepay.com/boleto',
					cardToken: 'NEVER_RETURN',
					metadata: input.metadata,
				},
			}),
		);
		vi.stubGlobal('fetch', fetcher);
		const gateway = new AbacatePayGateway('abc_dev_test');
		const result = await gateway.createTransparentCharge({
			...input,
			method,
			token: method === 'CARD' ? 'ctok_test' : undefined,
		});
		const [url, options] = fetcher.mock.calls[0];
		const body = JSON.parse(options.body);
		expect(url).toBe('https://api.abacatepay.com/v2/transparents/create');
		expect(body).toMatchObject({ method, data: { amount: 10000, metadata: input.metadata } });
		expect(body.externalId).toBeUndefined();
		if (method === 'CARD')
			expect(body.data).toMatchObject({ token: 'ctok_test', installmentCount: 2, customer, passFeesToCustomer: false });
		else expect(body.data.externalId).toBe('attempt-1');
		expect(result).toMatchObject({ id: 'charge_1', amountInCents: 10000, devMode: true });
		expect(JSON.stringify(result)).not.toContain('NEVER_RETURN');
	},
);
it('does not expose provider internals on a declined card', async () => {
	vi.stubGlobal(
		'fetch',
		vi
			.fn()
			.mockResolvedValue(Response.json({ success: false, error: 'Invalid or expired card token' }, { status: 400 })),
	);
	await expect(
		new AbacatePayGateway('abc_dev_test').createTransparentCharge({ ...input, method: 'CARD', token: 'ctok_test' }),
	).rejects.toMatchObject({ code: 'PAYMENT_DECLINED', statusCode: 422 });
});
it('treats a timeout as unknown rather than a safe retry', async () => {
	vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError')));
	await expect(
		new AbacatePayGateway('abc_dev_test').createTransparentCharge({ ...input, method: 'PIX' }),
	).rejects.toMatchObject({ code: 'PAYMENT_OUTCOME_UNKNOWN' });
});
it('loads the full transparent record with amount and fee for reconciliation', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			Response.json({
				success: true,
				data: [
					{
						id: 'card_1',
						status: 'APPROVED',
						amount: 10000,
						platformFee: 602,
						devMode: true,
						metadata: { checkout_attempt_id: 'attempt-1' },
						cardToken: 'secret',
					},
				],
			}),
		),
	);
	const result = await new AbacatePayGateway('abc_dev_test').findTransparentCharge({ id: 'card_1' });
	expect(result).toMatchObject({ id: 'card_1', amountInCents: 10000, providerFeeInCents: 602, status: 'APPROVED' });
	expect(JSON.stringify(result)).not.toContain('secret');
});
it('never treats the first credit installment fee as the full sale fee', async () => {
	vi.stubGlobal(
		'fetch',
		vi.fn().mockResolvedValue(
			Response.json({
				success: true,
				data: {
					id: 'card_1',
					status: 'APPROVED',
					amount: 30000,
					devMode: true,
					platformFee: 201,
					installmentCount: 3,
					installmentNumber: 1,
					installmentGroupId: 'group_1',
				},
			}),
		),
	);
	const result = await new AbacatePayGateway('abc_dev_test').createTransparentCharge({
		...input,
		method: 'CARD',
		installments: 3,
		amountInCents: 30000,
		token: 'ctok_1',
	});
	expect(result.providerFeeInCents).toBeNull();
});
it('sums verified fees from all card installments, following provider pagination', async () => {
	const first = {
		id: 'card_1',
		status: 'APPROVED',
		amount: 30000,
		devMode: true,
		platformFee: 201,
		installmentCount: 3,
		installmentNumber: 1,
		installmentAmount: 10000,
		installmentGroupId: 'group_1',
		createdAt: '2026-11-18T10:00:00Z',
	};
	const fetcher = vi
		.fn()
		.mockResolvedValueOnce(Response.json({ success: true, data: [first] }))
		.mockResolvedValueOnce(
			Response.json({
				success: true,
				data: [first, { ...first, id: 'card_2', installmentNumber: 2, platformFee: 200 }],
				pagination: { hasMore: true, next: 'cursor_part_2' },
			}),
		)
		.mockResolvedValueOnce(
			Response.json({
				success: true,
				data: [{ ...first, id: 'card_3', installmentNumber: 3, platformFee: 200 }],
				pagination: { hasMore: false, next: null },
			}),
		);
	vi.stubGlobal('fetch', fetcher);
	const result = await new AbacatePayGateway('abc_dev_test').findTransparentCharge({ id: 'card_1' });
	expect(result).toMatchObject({ amountInCents: 30000, providerFeeInCents: 601 });
	expect(String(fetcher.mock.calls[2][0])).toContain('after=cursor_part_2');
});
it('uses the actual settlement statement when a paid card record omits its fee', async () => {
	const fetcher = vi
		.fn()
		.mockResolvedValueOnce(
			Response.json({
				success: true,
				data: [{ id: 'card_1', status: 'PAID', amount: 10000, devMode: true, createdAt: '2026-11-18T10:00:00Z' }],
			}),
		)
		.mockResolvedValueOnce(
			Response.json({
				success: true,
				data: [
					{
						id: 'tran_1',
						paymentIntentId: 'card_1',
						currency: 'BRL',
						movements: [
							{ amount: 10000, category: 'transaction', balanceEffect: 'credit' },
							{ amount: 602, category: 'fee', balanceEffect: 'debit' },
						],
					},
					{
						id: 'unrelated',
						paymentIntentId: 'card_other',
						currency: 'BRL',
						movements: [{ amount: 999, category: 'fee', balanceEffect: 'debit' }],
					},
				],
			}),
		);
	vi.stubGlobal('fetch', fetcher);
	expect(await new AbacatePayGateway('abc_dev_test').findTransparentCharge({ id: 'card_1' })).toMatchObject({
		providerFeeInCents: 602,
		status: 'PAID',
	});
	expect(String(fetcher.mock.calls[1][0])).toContain('/bank-statement/list?');
});
it('holds card funds when only the first installment has settled', async () => {
	const first = {
		id: 'card_1',
		status: 'PAID',
		amount: 30000,
		devMode: true,
		platformFee: 201,
		installmentCount: 3,
		installmentNumber: 1,
		installmentAmount: 10000,
		installmentGroupId: 'group_1',
	};
	vi.stubGlobal(
		'fetch',
		vi
			.fn()
			.mockResolvedValueOnce(Response.json({ success: true, data: [first] }))
			.mockResolvedValueOnce(
				Response.json({
					success: true,
					data: [
						first,
						{ ...first, id: 'card_2', installmentNumber: 2, status: 'APPROVED' },
						{ ...first, id: 'card_3', installmentNumber: 3, status: 'APPROVED' },
					],
				}),
			),
	);
	expect(await new AbacatePayGateway('abc_dev_test').findTransparentCharge({ id: 'card_1' })).toMatchObject({
		status: 'APPROVED',
	});
});
