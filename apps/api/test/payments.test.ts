import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import {
	buildCheckoutPlan,
	CheckoutRuleViolation,
	type CheckoutTicketSnapshot,
} from '../src/application/payments/checkout-plan.js';
import {
	ManageTicketInventory,
	TicketInventoryUnavailable,
	type TicketInventoryRepository,
} from '../src/application/payments/manage-ticket-inventory.js';
import { buildInstallmentAmounts, InstallmentPlanUnavailable } from '../src/application/payments/installment-plan.js';
import {
	GetCheckoutStatus,
	summarizeCheckoutStatus,
	type CheckoutStatusRepository,
} from '../src/application/payments/get-checkout-status.js';
import {
	ReconcileCheckouts,
	type CheckoutReconciliationRepository,
} from '../src/application/payments/reconcile-checkouts.js';
import {
	ReconcileInstallmentCharges,
	type InstallmentChargeReconciliationRepository,
} from '../src/application/payments/reconcile-installment-charges.js';
import { SupabaseTicketInventoryRepository } from '../src/infrastructure/supabase/ticket-inventory-repository.js';
import type { SupabaseClient } from '@supabase/supabase-js';
import { vi } from 'vitest';
import { calculateOrganizerNet, calculatePlatformFee, calculateProviderFee } from '../src/application/payments/fees.js';
import { AbacatePayGateway, verifyAbacatePayWebhook } from '../src/infrastructure/payments/abacatepay-gateway.js';
import { MockPaymentGateway } from '../src/infrastructure/payments/mock-payment-gateway.js';

const configuration = {
	platform_fee_percentage: 5,
	pix_fee_fixed: 0.8,
	card_fee_percentage: 3.5,
	card_fee_fixed: 0.6,
	card_installment_2_6_percentage: 4,
	card_installment_7_12_percentage: 4.5,
	boleto_fee_fixed: 2.5,
};

const ticket: CheckoutTicketSnapshot = {
	id: '00000000-0000-4000-8000-000000000010',
	maxQuantityPerPurchase: 4,
	minQuantityPerPurchase: 1,
	price: 100,
	quantity: 10,
	quantitySold: 2,
	saleEndDate: '2026-12-31T23:59:59.000Z',
	saleStartDate: '2026-01-01T00:00:00.000Z',
	serviceFeeType: 'passed_to_buyer',
	status: 'active',
	visibility: 'public',
};

const webhookPublicKey =
	't9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9';

afterEach(() => vi.unstubAllGlobals());

describe('payment fees', () => {
	it('uses the configured AbacatePay rates for each payment method', () => {
		expect(calculatePlatformFee(100, configuration)).toBe(5);
		expect(calculateProviderFee(100, 'pix', configuration)).toBe(0.8);
		expect(calculateProviderFee(100, 'card', configuration)).toBe(4.1);
		expect(calculateProviderFee(100, 'card', configuration, 6)).toBe(4.6);
		expect(calculateProviderFee(100, 'card', configuration, 12)).toBe(5.1);
		expect(calculateProviderFee(100, 'boleto', configuration)).toBe(2.5);
	});

	it('does not subtract a platform fee twice when the buyer paid it', () => {
		expect(calculateOrganizerNet(100, 105, 5, 0.8)).toBe(99.2);
		expect(calculateOrganizerNet(100, 100, 5, 0.8)).toBe(94.2);
	});
});

describe('checkout plan', () => {
	it('applies ticket limits and fees in the application layer', () => {
		const [item] = buildCheckoutPlan({
			configuration,
			now: new Date('2026-08-06T12:00:00.000Z'),
			selections: [{ ticketId: ticket.id, quantity: 2 }],
			tickets: [ticket],
		});

		expect(item).toMatchObject({ baseAmount: 200, platformFee: 10, serviceFee: 10, totalAmount: 210 });
	});

	it.each([
		{
			name: 'duplicate selections',
			rule: 'duplicate_ticket',
			selections: [
				{ ticketId: ticket.id, quantity: 1 },
				{ ticketId: ticket.id, quantity: 1 },
			],
			ticket,
		},
		{
			name: 'minimum quantity',
			rule: 'minimum_quantity',
			selections: [{ ticketId: ticket.id, quantity: 1 }],
			ticket: { ...ticket, minQuantityPerPurchase: 2 },
		},
		{
			name: 'sale window',
			rule: 'ticket_unavailable',
			selections: [{ ticketId: ticket.id, quantity: 1 }],
			ticket: { ...ticket, saleStartDate: '2026-09-01T00:00:00.000Z' },
		},
		{
			name: 'non-public visibility',
			rule: 'ticket_unavailable',
			selections: [{ ticketId: ticket.id, quantity: 1 }],
			ticket: { ...ticket, visibility: 'invited_only' },
		},
		{
			name: 'atomic stock snapshot',
			rule: 'insufficient_stock',
			selections: [{ ticketId: ticket.id, quantity: 3 }],
			ticket: { ...ticket, quantity: 10, quantitySold: 8 },
		},
	])('rejects $name', ({ rule, selections, ticket: currentTicket }) => {
		try {
			buildCheckoutPlan({
				configuration,
				now: new Date('2026-08-06T12:00:00.000Z'),
				selections,
				tickets: [currentTicket],
			});
			expect.fail('Expected the checkout rule to fail');
		} catch (error) {
			expect(error).toBeInstanceOf(CheckoutRuleViolation);
			expect((error as CheckoutRuleViolation).rule).toBe(rule);
		}
	});

	it('rejects a checkout outside the event registration window', () => {
		expect(() =>
			buildCheckoutPlan({
				configuration,
				now: new Date('2026-08-06T12:00:00.000Z'),
				registrationWindow: { end: null, start: '2026-08-07T12:00:00.000Z' },
				selections: [{ ticketId: ticket.id, quantity: 1 }],
				tickets: [ticket],
			}),
		).toThrowError(expect.objectContaining({ rule: 'registration_closed' }));
	});
});

describe('ticket inventory', () => {
	it('reserves and releases checkout registrations through the application port', async () => {
		const inventory: TicketInventoryRepository = {
			reserve: vi.fn().mockResolvedValue(undefined),
			release: vi.fn().mockResolvedValue(undefined),
		};
		const service = new ManageTicketInventory(inventory);

		await service.reserve(['registration-1', 'registration-2']);
		await service.release(['registration-1']);

		expect(inventory.reserve).toHaveBeenCalledWith(['registration-1', 'registration-2']);
		expect(inventory.release).toHaveBeenCalledWith(['registration-1']);
	});

	it('maps the database race to a domain error', async () => {
		const database = {
			rpc: vi.fn().mockResolvedValue({
				data: null,
				error: { message: 'ticket inventory unavailable' },
			}),
		} as unknown as SupabaseClient;

		await expect(new SupabaseTicketInventoryRepository(database).reserve(['registration-1'])).rejects.toBeInstanceOf(
			TicketInventoryUnavailable,
		);
	});
});

describe('installment plan', () => {
	it('distributes cents without losing or creating money', () => {
		const amounts = buildInstallmentAmounts(100, 3, 50);

		expect(amounts).toEqual([33.33, 33.33, 33.34]);
		expect(amounts.reduce((total, amount) => total + amount, 0)).toBeCloseTo(100);
	});

	it.each([
		{ installments: 1, minimum: 0, total: 100 },
		{ installments: 13, minimum: 0, total: 100 },
		{ installments: 4, minimum: 50, total: 40 },
		{ installments: 12, minimum: 0, total: 0.1 },
	])('rejects an unavailable installment plan', ({ installments, minimum, total }) => {
		expect(() => buildInstallmentAmounts(total, installments, minimum)).toThrow(InstallmentPlanUnavailable);
	});
});

describe('checkout status', () => {
	const registration = {
		id: '00000000-0000-4000-8000-000000000020',
		status: 'pending',
		paymentStatus: 'pending',
		totalAmount: 100,
		ticketCode: 'EVT-123',
		event: {
			id: '00000000-0000-4000-8000-000000000030',
			title: 'Evento',
			slug: 'evento',
		},
	};

	it('distinguishes pending, confirmed and inconsistent multi-ticket purchases', () => {
		expect(summarizeCheckoutStatus([registration])).toBe('pending');
		expect(summarizeCheckoutStatus([{ ...registration, paymentStatus: 'paid' }])).toBe('confirmed');
		expect(
			summarizeCheckoutStatus([
				registration,
				{ ...registration, id: '00000000-0000-4000-8000-000000000021', paymentStatus: 'paid' },
			]),
		).toBe('attention');
	});

	it('loads only through the repository port and validates the response contract', async () => {
		const repository: CheckoutStatusRepository = { findByUser: vi.fn().mockResolvedValue([registration]) };
		const result = await new GetCheckoutStatus(repository).execute('user-1', {
			checkoutGroupId: '00000000-0000-4000-8000-000000000040',
		});

		expect(result.status).toBe('pending');
		expect(repository.findByUser).toHaveBeenCalledWith('user-1', {
			checkoutGroupId: '00000000-0000-4000-8000-000000000040',
		});
	});
});

describe('AbacatePay webhook security', () => {
	it('validates the documented HMAC-SHA256 signature using the raw body', () => {
		const body = Buffer.from(JSON.stringify({ id: 'log_test', event: 'checkout.completed' }));
		const signature = createHmac('sha256', webhookPublicKey).update(body).digest('base64');
		expect(verifyAbacatePayWebhook(body, signature)).toBe(true);
		expect(verifyAbacatePayWebhook(body, Buffer.from('invalid').toString('base64'))).toBe(false);
	});
});

describe('AbacatePay requests', () => {
	it('sends the required PIX method for transparent charges', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: { brCode: 'pix-code', brCodeBase64: null, expiresAt: null, id: 'pix-1' },
				error: null,
				success: true,
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		await new AbacatePayGateway('test-key').createPixCharge({
			externalId: 'installment-1',
			amountInCents: 1000,
			description: 'Parcela',
			expiresInSeconds: 3600,
			customer: { email: 'pessoa@example.com', name: 'Pessoa' },
			metadata: {},
		});

		const request = fetchMock.mock.calls[0][1] as RequestInit;
		expect(JSON.parse(String(request.body))).toMatchObject({ method: 'PIX' });
	});

	it('reads and validates a provider checkout status', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: {
					id: 'bill_1',
					externalId: 'checkout-group-1',
					status: 'PAID',
					amount: 1500,
					paidAmount: 1500,
				},
				error: null,
				success: true,
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const checkout = await new AbacatePayGateway('test-key').getCheckout('bill_1');

		expect(checkout).toMatchObject({ id: 'bill_1', status: 'PAID', paidAmountInCents: 1500 });
		expect(fetchMock.mock.calls[0][0]).toContain('/checkouts/get?id=bill_1');
		expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'GET' });
	});

	it('reads the transparent PIX state used to release expired reservations', async () => {
		const fetchMock = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({
				data: { id: 'pix_1', status: 'EXPIRED', expiresAt: '2026-08-06T12:00:00.000Z' },
				error: null,
				success: true,
			}),
		});
		vi.stubGlobal('fetch', fetchMock);

		const charge = await new AbacatePayGateway('test-key').getPixCharge('pix_1');

		expect(charge).toMatchObject({ id: 'pix_1', status: 'EXPIRED' });
		expect(fetchMock.mock.calls[0][0]).toContain('/transparents/check?id=pix_1');
	});
});

describe('checkout reconciliation', () => {
	it('settles paid checkouts, releases terminal ones and leaves pending inventory untouched', async () => {
		const candidates = ['paid', 'expired', 'pending'].map((suffix) => ({
			checkoutId: `checkout-${suffix}`,
			registrationIds: [`registration-${suffix}`],
		}));
		const repository: CheckoutReconciliationRepository = {
			claimPending: vi.fn().mockResolvedValue(candidates),
			settlePaid: vi.fn().mockResolvedValue(undefined),
			cancel: vi.fn().mockResolvedValue(undefined),
		};
		const gateway = new MockPaymentGateway();
		vi.spyOn(gateway, 'getCheckout').mockImplementation(async (id) => ({
			id,
			externalId: null,
			status: id.endsWith('paid') ? 'PAID' : id.endsWith('expired') ? 'EXPIRED' : 'PENDING',
			amountInCents: 0,
			paidAmountInCents: null,
		}));

		const result = await new ReconcileCheckouts(gateway, repository).execute({
			before: new Date('2026-08-06T12:00:00.000Z'),
			batchSize: 25,
		});

		expect(result).toMatchObject({ claimed: 3, paid: 1, cancelled: 1, pending: 1, failed: [] });
		expect(repository.settlePaid).toHaveBeenCalledWith(candidates[0]);
		expect(repository.cancel).toHaveBeenCalledWith(candidates[1], 'EXPIRED');
	});

	it('isolates provider failures so the rest of the claimed batch still runs', async () => {
		const candidates = [
			{ checkoutId: 'checkout-failed', registrationIds: ['registration-1'] },
			{ checkoutId: 'checkout-paid', registrationIds: ['registration-2'] },
		];
		const repository: CheckoutReconciliationRepository = {
			claimPending: vi.fn().mockResolvedValue(candidates),
			settlePaid: vi.fn().mockResolvedValue(undefined),
			cancel: vi.fn().mockResolvedValue(undefined),
		};
		const gateway = new MockPaymentGateway();
		vi.spyOn(gateway, 'getCheckout').mockRejectedValueOnce(new Error('provider timeout')).mockResolvedValueOnce({
			id: 'checkout-paid',
			externalId: null,
			status: 'PAID',
			amountInCents: 0,
			paidAmountInCents: 0,
		});

		const result = await new ReconcileCheckouts(gateway, repository).execute({
			before: new Date('2026-08-06T12:00:00.000Z'),
			batchSize: 25,
		});

		expect(result.paid).toBe(1);
		expect(result.failed).toEqual([{ checkoutId: 'checkout-failed', reason: 'provider timeout' }]);
	});
});

describe('installment charge reconciliation', () => {
	it('settles a missed PIX callback and cancels a first charge that expired unpaid', async () => {
		const candidates = [
			{ chargeId: 'charge-paid', installmentId: 'installment-1', registrationId: 'registration-1' },
			{ chargeId: 'charge-expired', installmentId: 'installment-2', registrationId: 'registration-2' },
		];
		const repository: InstallmentChargeReconciliationRepository = {
			claimPending: vi.fn().mockResolvedValue(candidates),
			settlePaid: vi.fn().mockResolvedValue(undefined),
			cancel: vi.fn().mockResolvedValue(undefined),
		};
		const gateway = new MockPaymentGateway();
		vi.spyOn(gateway, 'getPixCharge').mockImplementation(async (id) => ({
			id,
			status: id.endsWith('paid') ? 'PAID' : 'EXPIRED',
			expiresAt: null,
		}));

		const result = await new ReconcileInstallmentCharges(gateway, repository).execute({
			before: new Date('2026-08-06T12:00:00.000Z'),
			batchSize: 25,
		});

		expect(result).toMatchObject({ claimed: 2, paid: 1, cancelled: 1, failed: [] });
		expect(repository.settlePaid).toHaveBeenCalledWith(candidates[0]);
		expect(repository.cancel).toHaveBeenCalledWith(candidates[1], 'EXPIRED');
	});
});

describe('mock payment gateway', () => {
	it('keeps the same application contract without external network calls', async () => {
		const gateway = new MockPaymentGateway();
		const checkout = await gateway.createCheckout({
			externalId: 'order-1',
			items: [{ productId: 'product-1', quantity: 1 }],
			methods: ['PIX'],
			returnUrl: 'http://localhost/cancel',
			completionUrl: 'http://localhost/success',
			metadata: {},
		});
		expect(checkout.id).toBe('mock_checkout_order-1');
		expect(checkout.url).toBe('http://localhost/success');
	});
});
