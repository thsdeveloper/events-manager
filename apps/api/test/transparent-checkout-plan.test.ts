import { expect, it, vi } from 'vitest';
import { buildService, cart, event } from './support/transparent-fixtures.js';
import { TEST_USER_ID } from './support/index.js';
const logger = { error: vi.fn() };
const options = () => ({
	attemptId: '00000000-0000-4000-8000-000000000009',
	expectedAmountInCents: 10000,
	installments: 1,
	ready: vi.fn().mockResolvedValue(undefined),
});
it('quotes the exact server-calculated amount and lowest permitted installment limit', async () => {
	const { service, repository } = buildService({ methods: ['PIX', 'CARD'] });
	vi.mocked(repository.findCheckoutEvent).mockResolvedValue({
		...event,
		tickets: [{ ...event.tickets[0], allow_installments: true, max_installments: 6 }],
	});
	expect(await service.quote(cart)).toMatchObject({
		amountInCents: 10000,
		maxInstallments: 6,
		methods: ['PIX', 'CARD'],
	});
});
it('uses a transparent charge and creates no hosted products or redirect', async () => {
	const { service, gateway } = buildService();
	const result = await service.checkout(TEST_USER_ID, cart, logger, options());
	expect(gateway.createTransparentCharge).toHaveBeenCalledWith(
		expect.objectContaining({
			method: 'PIX',
			amountInCents: 10000,
			metadata: expect.objectContaining({ checkout_attempt_id: options().attemptId }),
		}),
	);
	expect(gateway.createProduct).not.toHaveBeenCalled();
	expect(gateway.createCheckout).not.toHaveBeenCalled();
	expect(result).toMatchObject({ payment: { copyPasteCode: 'pix-code' } });
});
it('rejects a stale or manipulated amount before creating registrations', async () => {
	const { service, repository, gateway } = buildService();
	await expect(
		service.checkout(TEST_USER_ID, cart, logger, { ...options(), expectedAmountInCents: 1 }),
	).rejects.toMatchObject({ code: 'CHECKOUT_PRICE_CHANGED' });
	expect(repository.createRegistration).not.toHaveBeenCalled();
	expect(gateway.createTransparentCharge).not.toHaveBeenCalled();
});
it('preserves the reservation when the provider outcome is unknown', async () => {
	const { service, repository, gateway } = buildService();
	vi.mocked(gateway.createTransparentCharge).mockRejectedValue(new Error('network timeout'));
	await expect(service.checkout(TEST_USER_ID, cart, logger, options())).rejects.toThrow();
	expect(repository.cancelIncompleteCheckout).not.toHaveBeenCalled();
});
it('rejects too many credit installments and never exceeds the limit of another selected ticket', async () => {
	const { service, repository } = buildService({ methods: ['CARD'] });
	vi.mocked(repository.findCheckoutEvent).mockResolvedValue({
		...event,
		tickets: [{ ...event.tickets[0], allow_installments: false }],
	});
	await expect(
		service.checkout(TEST_USER_ID, { ...cart, paymentMethod: 'CARD' }, logger, {
			...options(),
			token: 'ctok_x',
			installments: 2,
		}),
	).rejects.toMatchObject({ code: 'INSTALLMENTS_UNAVAILABLE' });
});

it('returns the current item prices and fee breakdown for the checkout summary', async () => {
	const { service } = buildService();
	expect(await service.quote(cart)).toMatchObject({
		items: [{ id: cart.tickets[0].ticketId, title: 'Inteira', quantity: 1, unitPrice: 100, unitFee: 0 }],
		discountInCents: 0,
	});
});
it.each([
	{ registration_start: '2026-10-01T00:00:00Z' },
	{ registration_end: '2026-09-01T00:00:00Z' },
	{ end_date: '2026-09-01T00:00:00Z' },
])('rejects closed event sales before quoting or creating a charge: %j', async (window) => {
	const { service, repository, gateway } = buildService();
	vi.mocked(repository.findCheckoutEvent).mockResolvedValue({ ...event, ...window });
	await expect(service.quote(cart)).rejects.toMatchObject({ code: 'EVENT_SALES_CLOSED' });
	await expect(service.checkout(TEST_USER_ID, cart, logger, options())).rejects.toMatchObject({
		code: 'EVENT_SALES_CLOSED',
	});
	expect(gateway.createTransparentCharge).not.toHaveBeenCalled();
	expect(repository.createRegistration).not.toHaveBeenCalled();
});
