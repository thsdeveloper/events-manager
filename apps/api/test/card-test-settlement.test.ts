import { expect, it, vi } from 'vitest';
import type { CheckoutEvent } from '../src/application/payments/payment-service.js';
import { buildService, cart, event } from './support/transparent-fixtures.js';
import { TEST_USER_ID } from './support/index.js';

it('quotes and creates a sandbox card payment despite a different requested settlement period', async () => {
	const { service, repository, gateway, registrations } = buildService({ methods: ['PIX', 'CARD'], testMode: true });
	vi.mocked(repository.findCheckoutEvent).mockResolvedValue({
		...event,
		organizer_id: { accepted_payment_methods: ['PIX', 'CARD'], credit_card_settlement_period: 'D+30' },
	} as unknown as CheckoutEvent);
	expect((await service.quote(cart)).methods).toEqual(['PIX', 'CARD']);
	await service.checkout(
		TEST_USER_ID,
		{ ...cart, paymentMethod: 'CARD' },
		{ error() {} },
		{
			attemptId: TEST_USER_ID,
			expectedAmountInCents: 10000,
			token: 'ctok_test',
			installments: 1,
			ready: vi.fn(),
		},
	);
	expect(gateway.createTransparentCharge).toHaveBeenCalledWith(
		expect.objectContaining({ method: 'CARD', token: 'ctok_test' }),
	);
	expect(registrations[0]).toMatchObject({
		status: 'pending',
		payment_status: 'pending',
		additional_info: {
			payment_preferences: { credit_card_settlement_period: 'D+30' },
			gateway_card_settlement_period: 'D+1',
		},
	});
});
