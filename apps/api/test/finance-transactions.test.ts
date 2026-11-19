import { describe, expect, it, vi } from 'vitest';
import { FinanceService, type FinanceRepository } from '../src/application/finance/finance-service.js';
import { partialMock } from './support/index.js';

const registration = {
	id: 'registration',
	event_id: { id: 'event', title: 'Congresso' },
	payment_status: 'paid',
	total_amount: 500,
	payment_amount: 500,
	quantity: 2,
};
const transaction = {
	id: 'transaction',
	registration_id: registration,
	provider: 'abacatepay',
	status: 'pending',
	event_type: 'transparent.reconciled_paid',
	amount: 250,
	provider_fee: 0,
	platform_fee: 0,
	organizer_net: 0,
	metadata: { source: 'provider_status_reconciliation', token: 'never-expose' },
};
function setup(rows: unknown[]) {
	const repository = partialMock<FinanceRepository>({
		findTransaction: vi.fn(),
		listRegistrations: vi.fn().mockResolvedValue([registration]),
		listTransactions: vi.fn().mockResolvedValue({ data: rows, total: rows.length }),
	});
	return { service: new FinanceService(repository, 'abacatepay'), repository };
}
const query = { page: 1, limit: 20, sort_direction: 'desc' as const };
describe('finance payment status versus fee settlement', () => {
	it('shows a reconciled Pix installment as paid while its fees and net remain unconfirmed', async () => {
		const { service } = setup([transaction]);
		const result = await service.transactions('organizer', query);
		expect(result.data[0]).toMatchObject({
			status: 'succeeded',
			settlement_status: 'pending',
			amount: 250,
			provider_fee: null,
			organizer_net: null,
		});
		expect(result.data[0]).not.toHaveProperty('metadata');
		expect(transaction.status).toBe('pending');
	});
	it.each(['PAID', 'APPROVED'])(
		'shows provider-confirmed %s payment without fabricating settled funds',
		async (providerStatus) => {
			const { service } = setup([
				{ ...transaction, event_type: 'transparent.completed', metadata: { provider_status: providerStatus } },
			]);
			expect((await service.transactions('organizer', query)).data[0]).toMatchObject({
				status: 'succeeded',
				settlement_status: 'pending',
				organizer_net: null,
			});
		},
	);
	it.each(['pending', 'failed', 'refunded'])(
		'preserves a %s movement even if the purchase was paid by another charge',
		async (status) => {
			const { service } = setup([
				{ ...transaction, status, event_type: 'checkout.disputed', metadata: { provider_status: 'UNDER_DISPUTE' } },
			]);
			expect((await service.transactions('organizer', query)).data[0]).toMatchObject({ status });
		},
	);
	it('keeps confirmed transaction fees and net separate from the order totals', async () => {
		const { service } = setup([
			{ ...transaction, status: 'succeeded', provider_fee: 2, platform_fee: 5, organizer_net: 243 },
		]);
		expect((await service.transactions('organizer', query)).data[0]).toMatchObject({
			status: 'succeeded',
			settlement_status: 'settled',
			amount: 250,
			provider_fee: 2,
			platform_fee: 5,
			organizer_net: 243,
		});
	});
});

it('never loads transaction details outside the selected event', async () => {
	const { service, repository } = setup([]);
	await expect(service.transaction('organizer', 'transaction', 'another-event')).rejects.toMatchObject({
		statusCode: 404,
	});
	expect(repository.findTransaction).not.toHaveBeenCalled();
});
