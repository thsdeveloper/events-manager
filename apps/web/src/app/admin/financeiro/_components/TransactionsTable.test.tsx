import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, mockFetch, jsonResponse } from '@/test';
import TransactionsTable from './TransactionsTable';

describe('TransactionsTable', () => {
	it('shows a standard empty state when no transaction matches the filters', () => {
		const { container } = renderWithProviders(
			<TransactionsTable
				rows={[]}
				isLoading={false}
				pagination={{ page: 1, limit: 20, total: 0, pageCount: 0 }}
				onPageChange={vi.fn()}
				onSortChange={vi.fn()}
				sort={{ field: 'date', direction: 'desc' }}
				currencyFormatter={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })}
			/>,
		);

		expect(screen.getByText(/nenhuma transação encontrada/i)).toBeInTheDocument();
		expect(container.querySelector('img')).not.toBeInTheDocument();
	});
});

const row = {
	id: 'tx1',
	date: '2026-11-19T18:05:00Z',
	status: 'succeeded',
	transactionId: 'pix-charge-1',
	eventTitle: 'Congresso',
	participantName: 'Ana Souza',
	participantEmail: 'ana@example.test',
	quantity: 2,
	gross: 250,
	fee: 0,
	net: 0,
	paymentStatus: 'paid',
	paymentIntentId: 'pix-charge-1',
};
const details = {
	transaction: {
		id: 'tx1',
		status: 'succeeded',
		settlement_status: 'pending',
		amount: 250,
		provider: 'abacatepay',
		event_type: 'transparent.reconciled_paid',
		date_created: '2026-11-19T18:05:00Z',
		provider_object_id: 'pix-charge-1',
		provider_event_id: 'confirmed-1',
		provider_fee: null,
		platform_fee: null,
		organizer_net: null,
	},
	registration: {
		id: 'order1',
		status: 'confirmed',
		payment_status: 'paid',
		payment_method: 'pix',
		is_installment_payment: true,
		total_installments: 2,
		installment_plan_status: 'completed',
		participant_name: 'Ana Souza',
		participant_email: 'ana@example.test',
		participant_phone: '11999990000',
		participant_document: '12345678909',
		quantity: 2,
		total_amount: 500,
		payment_amount: 500,
	},
	event: { id: 'event1', title: 'Congresso', location_name: 'Pavilhão', start_date: '2027-11-21T18:00:00Z' },
	ticket_type: { id: 'type1', title: 'Inteira' },
	installments: [
		{
			id: 'i1',
			installment_number: 1,
			total_installments: 2,
			amount: 250,
			status: 'paid',
			due_date: '2026-11-19',
			paid_at: '2026-11-19T18:05:00Z',
			provider_transaction_id: 'pix-charge-1',
		},
		{
			id: 'i2',
			installment_number: 2,
			total_installments: 2,
			amount: 250,
			status: 'paid',
			due_date: '2026-12-19',
			paid_at: '2026-11-19T18:07:00Z',
			provider_transaction_id: 'pix-charge-2',
		},
	],
	tickets: [{ id: 'ticket1', sequence: 1, ticket_code: 'EVT-123', attendee_name: 'Ana Souza', is_buyer: true }],
	movements: [
		{
			id: 'tx1',
			status: 'succeeded',
			settlement_status: 'pending',
			amount: 250,
			date_created: '2026-11-19T18:05:00Z',
			event_type: 'transparent.reconciled_paid',
			provider_object_id: 'pix-charge-1',
		},
	],
};
function renderTable() {
	return renderWithProviders(
		<TransactionsTable
			rows={[row]}
			isLoading={false}
			pagination={{ page: 1, limit: 20, total: 1, pageCount: 1 }}
			onPageChange={vi.fn()}
			onSortChange={vi.fn()}
			sort={{ field: 'date', direction: 'desc' }}
			currencyFormatter={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })}
		/>,
	);
}
it('opens the complete transaction from a row and distinguishes payment from fee reconciliation', async () => {
	const fetch = mockFetch([['/api/organizer/finance/transactions/tx1', () => jsonResponse(details)]]);
	const { user } = renderTable();
	expect(fetch).not.toHaveBeenCalled();
	await user.click(screen.getByText('Ana Souza'));
	const dialog = await screen.findByRole('dialog', { name: 'Detalhes da transação' });
	expect(await within(dialog).findByText('Conciliação pendente')).toBeInTheDocument();
	expect(within(dialog).getByText(/^Pix parcelado · 2 parcelas/)).toBeInTheDocument();
	expect(within(dialog).getByText('2 de 2 parcelas pagas')).toBeInTheDocument();
	expect(within(dialog).getByText('EVT-123')).toBeInTheDocument();
	expect(within(dialog).getByText('12345678909')).toBeInTheDocument();
	expect(within(dialog).getByRole('heading', { name: 'Histórico de movimentações' })).toBeInTheDocument();
	await user.keyboard('{Escape}');
	expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('offers a keyboard-accessible transaction action', async () => {
	mockFetch([['/api/organizer/finance/transactions/tx1', () => jsonResponse(details)]]);
	const { user } = renderTable();
	const action = screen.getByRole('button', { name: 'Ver detalhes da transação pix-charge-1' });
	action.focus();
	await user.keyboard('{Enter}');
	expect(await screen.findByRole('dialog', { name: 'Detalhes da transação' })).toBeInTheDocument();
});
it('allows retrying a failed detail request without losing the table', async () => {
	let failed = true;
	mockFetch([
		[
			'/api/organizer/finance/transactions/tx1',
			() =>
				failed
					? jsonResponse({ detail: 'Não foi possível carregar a transação.' }, { status: 503 })
					: jsonResponse(details),
		],
	]);
	const { user } = renderTable();
	await user.click(screen.getByText('Ana Souza'));
	expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar a transação.');
	failed = false;
	await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
	expect(await screen.findByText('2 de 2 parcelas pagas')).toBeInTheDocument();
});

it.each([
	['card', 3, 'Cartão de crédito · 3 parcelas'],
	['card', 1, 'Cartão de crédito · à vista'],
	['pix', null, 'Pix à vista'],
	['boleto', null, 'Boleto à vista'],
	['unknown', null, 'unknown'],
] as const)(
	'shows %s details with confirmed fees, receipt and no Pix installment schedule',
	async (method, count, label) => {
		mockFetch([
			[
				'/api/organizer/finance/transactions/tx1',
				() =>
					jsonResponse({
						...details,
						transaction: {
							...details.transaction,
							settlement_status: 'settled',
							provider_fee: 2,
							platform_fee: 5,
							organizer_net: 243,
						},
						registration: {
							...details.registration,
							payment_method: method,
							is_installment_payment: false,
							card_installments: count,
							receipt_url: 'https://app.abacatepay.com/receipt/123',
						},
						installments: [],
						tickets: [],
					}),
			],
		]);
		const { user } = renderTable();
		await user.click(screen.getByText('Ana Souza'));
		expect(await screen.findByText(label)).toBeInTheDocument();
		expect(screen.getByText('Valores conciliados com o provedor.')).toBeInTheDocument();
		expect(screen.getByText(/R\$\s?243,00/)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Abrir comprovante' })).toHaveAttribute(
			'href',
			'https://app.abacatepay.com/receipt/123',
		);
		expect(screen.queryByRole('heading', { name: 'Parcelas do Pix' })).not.toBeInTheDocument();
		expect(screen.getByText('Nenhum ingresso nominal registrado.')).toBeInTheDocument();
	},
);
it('shows refunds, cancellations, check-ins and provider movement history without making an unsafe receipt link', async () => {
	const events = [
		'checkout.completed',
		'checkout.refunded',
		'checkout.disputed',
		'checkout.lost',
		'checkout.expired',
		'checkout.cancelled',
		'outro',
	];
	mockFetch([
		[
			'/api/organizer/finance/transactions/tx1',
			() =>
				jsonResponse({
					...details,
					transaction: { ...details.transaction, status: 'refunded', settlement_status: 'not_applicable' },
					registration: {
						...details.registration,
						status: 'cancelled',
						payment_status: 'refunded',
						cancelled_at: '2026-11-19T20:00:00Z',
						cancelled_reason: 'Solicitação do cliente.',
						notes: 'Atendimento concluído.',
						provider_refund_id: 'refund-123',
						checkout_group_id: 'group-123',
						receipt_url: 'javascript:alert(1)',
					},
					installments: [{ ...details.installments[0], status: 'overdue', paid_at: null, payment_confirmed_at: null }],
					tickets: [
						{ ...details.tickets[0], check_in_date: '2026-11-19T19:00:00Z' },
						{ ...details.tickets[0], id: 'guest', sequence: 2, is_buyer: false, attendee_name: null },
					],
					movements: events.map((event_type, index) => ({
						...details.movements[0],
						id: 'm' + index,
						event_type,
						status:
							index === 0
								? 'succeeded'
								: index === 1
									? 'refunded'
									: index === 2
										? 'pending'
										: index === 3
											? 'failed'
											: 'cancelled',
					})),
				}),
		],
	]);
	const { user } = renderTable();
	await user.click(screen.getByText('Ana Souza'));
	expect(await screen.findByText('Esta movimentação não representa saldo liberado para repasse.')).toBeInTheDocument();
	expect(screen.getByText(/Solicitação do cliente/)).toBeInTheDocument();
	expect(screen.getByText(/Atendimento concluído/)).toBeInTheDocument();
	expect(screen.getByText('refund-123')).toBeInTheDocument();
	expect(screen.getByText(/Check-in em/)).toBeInTheDocument();
	expect(screen.getByText('Vencida')).toBeInTheDocument();
	for (const label of [
		'Pagamento processado',
		'Reembolso',
		'Pagamento em disputa',
		'Disputa encerrada',
		'Cobrança expirada',
		'Cobrança cancelada',
	])
		expect(screen.getByText(label)).toBeInTheDocument();
	expect(screen.queryByRole('link', { name: 'Abrir comprovante' })).not.toBeInTheDocument();
});
it('refreshes provider settlement inside the open details', async () => {
	let settled = false;
	mockFetch([
		[
			'/api/organizer/finance/transactions/tx1',
			() =>
				jsonResponse({
					...details,
					transaction: settled
						? {
								...details.transaction,
								settlement_status: 'settled',
								provider_fee: 2,
								platform_fee: 5,
								organizer_net: 243,
							}
						: details.transaction,
				}),
		],
	]);
	const { user } = renderTable();
	await user.click(screen.getByText('Ana Souza'));
	expect(await screen.findByText('Conciliação pendente')).toBeInTheDocument();
	settled = true;
	await user.click(screen.getByRole('button', { name: 'Atualizar transação' }));
	expect(await screen.findByText('Valores conciliados com o provedor.')).toBeInTheDocument();
	expect(screen.queryByText('Conciliação pendente')).not.toBeInTheDocument();
});
