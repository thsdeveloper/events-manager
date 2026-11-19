import { expect, it, vi } from 'vitest';
import {
	TransparentCheckoutService,
	type TransparentAttemptRepository,
} from '../src/application/payments/transparent-checkout-service.js';
import { partialMock, TEST_USER_ID } from './support/index.js';
import type { PaymentService } from '../src/application/payments/payment-service.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import { cart } from './support/transparent-fixtures.js';
import { SupabaseTransparentAttemptRepository } from '../src/infrastructure/supabase/transparent-attempt-repository.js';
const input = {
	...cart,
	requestId: '00000000-0000-4000-8000-000000000009',
	paymentMethod: 'PIX' as const,
	expectedAmountInCents: 10000,
	installments: 1,
};
const attempt = {
	id: input.requestId,
	user_id: TEST_USER_ID,
	fingerprint: '',
	method: 'PIX',
	amount: 10000,
	status: 'processing' as const,
	registration_ids: [],
	provider_id: null,
	charge: null,
	confirmation_url: null,
	error_message: null,
	created_at: '2026-11-18T10:00:00Z',
};
function setup(overrides: Partial<TransparentAttemptRepository> = {}) {
	const repo = partialMock<TransparentAttemptRepository>({
		claim: vi.fn(async (row) => ({ created: true, attempt: { ...attempt, ...row } })),
		find: vi.fn().mockResolvedValue(attempt),
		prepare: vi.fn(),
		saveResult: vi.fn(),
		fail: vi.fn(),
		settle: vi.fn(),
		...overrides,
	});
	const payment = partialMock<PaymentService>({
		checkout: vi
			.fn()
			.mockResolvedValue({ registrationId: 'r', url: 'https://events.local/success', checkoutId: 'free' }),
	});
	const gateway = partialMock<PaymentGateway>({
		provider: 'abacatepay',
		findTransparentCharge: vi.fn().mockResolvedValue(null),
	});
	const service = new TransparentCheckoutService(repo, payment, gateway, true);
	return { repo, payment, gateway, service };
}
it('returns a concurrent attempt without sending another charge', async () => {
	const { service, payment, repo } = setup();
	vi.mocked(repo.claim).mockImplementation(async (row) => ({ created: false, attempt: { ...attempt, ...row } }));
	expect(await service.create(TEST_USER_ID, input, { error: vi.fn() })).toMatchObject({
		attemptId: input.requestId,
		status: 'processing',
	});
	expect(payment.checkout).not.toHaveBeenCalled();
});
it('rejects reuse of the request id with another cart', async () => {
	const { service, payment } = setup({
		claim: vi.fn().mockResolvedValue({ created: false, attempt: { ...attempt, fingerprint: 'different' } }),
	});
	await expect(service.create(TEST_USER_ID, input, { error: vi.fn() })).rejects.toMatchObject({
		code: 'CHECKOUT_REQUEST_CONFLICT',
	});
	expect(payment.checkout).not.toHaveBeenCalled();
});
it('keeps unknown submissions pending and never stores a card token', async () => {
	const { service, payment, repo } = setup();
	vi.mocked(payment.checkout).mockRejectedValue(new Error('network'));
	expect(await service.create(TEST_USER_ID, { ...input, token: 'ctok_secret' }, { error: vi.fn() })).toMatchObject({
		status: 'processing',
	});
	expect(repo.fail).not.toHaveBeenCalled();
	expect(JSON.stringify(vi.mocked(repo.claim).mock.calls)).not.toContain('ctok_secret');
});
it('does not expose another buyer’s attempt', async () => {
	const { service } = setup({ find: vi.fn().mockResolvedValue(null) });
	await expect(service.status('other-user', input.requestId)).rejects.toMatchObject({ statusCode: 404 });
});
it('rejects a signed provider event with a mismatched amount or environment', async () => {
	const { service, repo } = setup({ findForProvider: vi.fn().mockResolvedValue(attempt) });
	await expect(
		service.webhook({
			event: 'transparent.completed',
			data: {
				transparent: {
					id: 'pix_1',
					amount: 1,
					status: 'PAID',
					devMode: true,
					metadata: { checkout_attempt_id: attempt.id },
				},
			},
		}),
	).rejects.toMatchObject({ code: 'PAYMENT_AMOUNT_MISMATCH' });
	expect(repo.settle).not.toHaveBeenCalled();
	await expect(
		service.webhook({
			event: 'transparent.completed',
			data: {
				transparent: {
					id: 'pix_1',
					amount: 10000,
					status: 'PAID',
					devMode: false,
					metadata: { checkout_attempt_id: attempt.id },
				},
			},
		}),
	).rejects.toMatchObject({ code: 'PAYMENT_ENVIRONMENT_MISMATCH' });
});
it('keeps partial card fees unconfirmed and strips permanent tokens from webhook data', async () => {
	const { service, repo } = setup({ findForProvider: vi.fn().mockResolvedValue({ ...attempt, method: 'CARD' }) });
	await service.webhook({
		event: 'transparent.completed',
		data: {
			transparent: {
				id: 'card_1',
				amount: 10000,
				status: 'APPROVED',
				devMode: true,
				platformFee: 201,
				installmentCount: 3,
				cardToken: 'secret',
			},
		},
	});
	expect(repo.settle).toHaveBeenCalledWith(
		attempt.id,
		expect.objectContaining({ providerFeeInCents: null, status: 'APPROVED' }),
		'transparent.completed',
	);
	expect(JSON.stringify(vi.mocked(repo.settle).mock.calls)).not.toContain('secret');
});
it.each([
	[{ amount: 10000, platformFee: 10001 }, 'PAYMENT_FEE_MISMATCH'],
	[{ amount: 10000, status: 'PENDING' }, 'PAYMENT_STATUS_MISMATCH'],
])('rejects inconsistent provider completion %j', async (overrides, code) => {
	const { service, repo } = setup({ findForProvider: vi.fn().mockResolvedValue(attempt) });
	await expect(
		service.webhook({
			event: 'transparent.completed',
			data: { transparent: { id: 'pix_1', status: 'PAID', devMode: true, ...overrides } },
		}),
	).rejects.toMatchObject({ code });
	expect(repo.settle).not.toHaveBeenCalled();
});
it('reconciles boleto paid by Pix without changing the expected purchase amount', async () => {
	const { service, repo } = setup({ findForProvider: vi.fn().mockResolvedValue({ ...attempt, method: 'BOLETO' }) });
	await expect(
		service.webhook({
			event: 'transparent.completed',
			data: {
				payerInformation: { method: 'PIX' },
				transparent: { id: 'bole_1', amount: 10000, status: 'PAID', devMode: true, platformFee: 80 },
			},
		}),
	).resolves.toEqual({ received: true });
	expect(repo.settle).toHaveBeenCalledWith(
		attempt.id,
		expect.objectContaining({ method: 'PIX', providerFeeInCents: 80 }),
		'transparent.completed',
	);
});
it('reconciles pending attempts independently when one provider lookup fails', async () => {
	const { service, repo, gateway } = setup({
		pending: vi.fn().mockResolvedValue([attempt, { ...attempt, id: 'other', provider_id: 'pix_other' }]),
	});
	vi.mocked(gateway.findTransparentCharge).mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(null);
	await expect(service.reconcilePending()).resolves.toBeUndefined();
	expect(gateway.findTransparentCharge).toHaveBeenCalledTimes(2);
});
it('keeps the stored status available when provider reads fail', async () => {
	const { service, gateway } = setup();
	vi.mocked(gateway.findTransparentCharge).mockRejectedValue(new Error('network'));
	expect(await service.status(TEST_USER_ID, attempt.id)).toMatchObject({ status: 'processing' });
});
it('confirms a free checkout without a provider mutation', async () => {
	const { service, repo, gateway } = setup();
	await service.create(TEST_USER_ID, input, { error: vi.fn() });
	expect(repo.saveResult).toHaveBeenCalledWith(input.requestId, expect.objectContaining({ confirmed: true }));
	expect(gateway.findTransparentCharge).not.toHaveBeenCalled();
});
it('preserves local development confirmations when the sandbox provider still reports a pending or expired charge', async () => {
	const simulated = {
		...attempt,
		status: 'confirmed' as const,
		provider_id: 'bole_test',
		charge: {
			id: 'bole_test',
			method: 'BOLETO' as const,
			status: 'PAID' as const,
			amountInCents: 10000,
			copyPasteCode: null,
			qrCodeBase64: null,
			barcode: null,
			boletoUrl: null,
			expiresAt: null,
			developmentSimulation: true,
		},
	};
	const { service, repo, gateway } = setup({ findForProvider: vi.fn().mockResolvedValue(simulated) });
	await service.reconcile(simulated);
	await service.webhook({
		event: 'transparent.expired',
		data: { transparent: { id: 'bole_test', status: 'EXPIRED', amount: 10000, devMode: true } },
	});
	expect(gateway.findTransparentCharge).not.toHaveBeenCalled();
	expect(repo.settle).not.toHaveBeenCalled();
});
it('excludes locally simulated purchases from the provider reconciliation queue', async () => {
	const query = {
		select: vi.fn().mockReturnThis(),
		or: vi.fn().mockReturnThis(),
		is: vi.fn().mockReturnThis(),
		lt: vi.fn().mockReturnThis(),
		order: vi.fn().mockReturnThis(),
		limit: vi.fn().mockResolvedValue({ data: [], error: null }),
	};
	const db = partialMock<ConstructorParameters<typeof SupabaseTransparentAttemptRepository>[0]>({
		from: vi.fn().mockReturnValue(query),
	});
	await new SupabaseTransparentAttemptRepository(db).pending(5);
	expect(query.is).toHaveBeenCalledWith('charge->>developmentSimulation', null);
});
