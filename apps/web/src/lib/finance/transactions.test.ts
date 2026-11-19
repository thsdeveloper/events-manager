import { expect, it } from 'vitest';
import { mockFetch, jsonResponse } from '@/test/fetch';
import { fetchTransactions } from './api-client';
const filters = {
	range: '30d' as const,
	status: 'all' as const,
	eventId: 'all',
	search: '',
	customFrom: null,
	customTo: null,
};
it('uses the installment amount and leaves unconfirmed fees and net unknown', async () => {
	mockFetch([
		[
			'/api/organizer/finance/transactions',
			() =>
				jsonResponse({
					data: [
						{
							id: 'movement',
							status: 'succeeded',
							settlement_status: 'pending',
							amount: 250,
							provider_fee: null,
							platform_fee: null,
							organizer_net: null,
							registration_id: {
								total_amount: 500,
								payment_amount: 500,
								service_fee: 20,
								payment_method: 'pix',
								is_installment_payment: true,
								total_installments: 2,
							},
						},
					],
					pagination: { page: 1, limit: 20, total: 1, pageCount: 1 },
				}),
		],
	]);
	const result = await fetchTransactions(filters, { page: 1, limit: 20 }, { field: 'date', direction: 'desc' });
	expect(result.data[0]).toMatchObject({
		gross: 250,
		fee: null,
		net: null,
		status: 'succeeded',
		paymentMethod: 'pix',
		settlementStatus: 'pending',
	});
});
it('uses confirmed movement fees and net instead of purchase totals', async () => {
	mockFetch([
		[
			'/api/organizer/finance/transactions',
			() =>
				jsonResponse({
					data: [
						{
							id: 'movement',
							status: 'succeeded',
							settlement_status: 'settled',
							amount: 250,
							provider_fee: 2,
							platform_fee: 5,
							organizer_net: 243,
							registration_id: { total_amount: 500, payment_amount: 500, service_fee: 20 },
						},
					],
				}),
		],
	]);
	const result = await fetchTransactions(filters, { page: 1, limit: 20 }, { field: 'date', direction: 'desc' });
	expect(result.data[0]).toMatchObject({ gross: 250, fee: 7, net: 243 });
});
