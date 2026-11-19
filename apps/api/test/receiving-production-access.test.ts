import { describe, expect, it, vi } from 'vitest';
import { PaymentService, type PaymentRepository } from '../src/application/payments/payment-service.js';
import type { PaymentGateway } from '../src/application/payments/payment-gateway.js';
import { partialMock } from './support/index.js';
import { ManageTicketInventory } from '../src/application/payments/manage-ticket-inventory.js';
import { GetCheckoutStatus } from '../src/application/payments/get-checkout-status.js';
import { EnforceRateLimit } from '../src/application/security/rate-limit.js';
function setup(approved: boolean) {
	const repository = partialMock<PaymentRepository>({
		findCheckoutEvent: vi.fn().mockResolvedValue({ id: 'event', tickets: [] }),
		getConfiguration: vi.fn().mockResolvedValue({}),
		isOrganizerApprovedForEvent: vi.fn().mockResolvedValue(approved),
		findTicketForInstallments: vi.fn().mockResolvedValue({
			id: 'ticket',
			allow_pix_installments: true,
			max_pix_installments: 6,
			event_id: { id: 'event', status: 'published' },
		}),
		createRegistration: vi.fn(),
	});
	const service = new PaymentService(
		repository,
		partialMock<PaymentGateway>({ provider: 'abacatepay' }),
		new ManageTicketInventory(partialMock({})),
		new GetCheckoutStatus(partialMock({})),
		new EnforceRateLimit({ consume: vi.fn().mockResolvedValue(true) }),
		'https://test.example',
	);
	return { service, repository };
}
describe('first approval before real sales', () => {
	it('blocks hosted checkout before any registration or payment is created', async () => {
		const { service, repository } = setup(false);
		await expect(
			service.checkout(
				'buyer',
				{ eventId: 'event', tickets: [], participantInfo: { name: 'Buyer', email: 'a@b.com' } },
				{ error: vi.fn() },
			),
		).rejects.toMatchObject({ code: 'ORGANIZER_PRODUCTION_PENDING' });
		expect(repository.createRegistration).not.toHaveBeenCalled();
	});
	it('blocks new installment plans before the first approval', async () => {
		const { service, repository } = setup(false);
		await expect(
			service.createInstallmentCheckout(
				'buyer',
				{ ticket_id: 'ticket', quantity: 1, installments: 2, participant_name: 'Buyer', participant_email: 'a@b.com' },
				{ error: vi.fn() },
			),
		).rejects.toMatchObject({ code: 'ORGANIZER_PRODUCTION_PENDING' });
		expect(repository.createRegistration).not.toHaveBeenCalled();
	});
});

import { SupabasePaymentRepository } from '../src/infrastructure/supabase/payment-repository.js';
import { createSupabaseClientsStub } from './support/index.js';
it.each([
	[{ status: 'active', production_approved_at: '2026-11-18T12:00:00Z', payout_status: 'pending_review' }, true],
	[{ status: 'active', production_approved_at: '2026-11-18T12:00:00Z', payout_status: 'blocked' }, true],
	[{ status: 'active', production_approved_at: null }, false],
	[{ status: 'archived', production_approved_at: '2026-11-18T12:00:00Z' }, false],
	[null, false],
] as const)(
	'uses the first production approval, independently of a subsequent receiving review',
	async (organizer, expected) => {
		const stub = createSupabaseClientsStub({ tables: { events: { data: { organizer } } } });
		expect(await new SupabasePaymentRepository(stub.clients).isOrganizerApprovedForEvent('event')).toBe(expected);
	},
);
