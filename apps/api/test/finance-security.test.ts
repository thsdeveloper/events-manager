import { describe, expect, it, vi } from 'vitest';
import {
	FinanceService,
	type FinanceRepository,
	type FinanceRegistration,
} from '../src/application/finance/finance-service.js';
import { partialMock } from './support/index.js';

const now = new Date('2026-11-17T12:00:00Z').getTime();
function setup(rows: FinanceRegistration[] = []) {
	const repository = partialMock<FinanceRepository>({
		listRegistrations: vi.fn().mockResolvedValue(rows),
		listEvents: vi.fn().mockResolvedValue([{ id: 'owned', title: 'Meu evento', status: 'published' }]),
		listTickets: vi.fn().mockResolvedValue([]),
		listInstallments: vi.fn().mockResolvedValue([]),
		listPayouts: vi.fn().mockResolvedValue([]),
		listSucceededTransactionNets: vi.fn().mockResolvedValue([]),
		listTransactions: vi.fn().mockResolvedValue({ data: [], total: 0 }),
	});
	return { repository, service: new FinanceService(repository, 'abacatepay', () => now) };
}

describe('finance authorization', () => {
	it('does not load private ticket metrics for another organizer event', async () => {
		const { service, repository } = setup();
		await expect(service.analytics('owner', { event_id: 'foreign' })).rejects.toMatchObject({
			statusCode: 404,
			code: 'EVENT_NOT_FOUND',
		});
		expect(repository.listTickets).not.toHaveBeenCalled();
	});
	it('shows an empty owned event without leaking other event registrations', async () => {
		const { service } = setup();
		const result = await service.analytics('owner', { event_id: 'owned' });
		expect(result.kpi).toMatchObject({ totalRevenue: 0, ticketsSold: 0, uniqueParticipants: 0 });
	});
});

describe('finance data isolation and accounting', () => {
	const rows: FinanceRegistration[] = [
		{
			id: 'paid',
			event_id: { id: 'owned' },
			date_created: '2026-11-15T12:00:00Z',
			payment_status: 'paid',
			payment_amount: 100,
			total_amount: 110,
			platform_fee: 10,
			provider_fee: 2,
			quantity: 2,
			participant_email: 'ana@example.com',
			participant_name: 'Ana',
			payment_method: 'PIX',
			check_in_date: '2026-11-15T16:00:00Z',
		},
		{
			id: 'free',
			event_id: { id: 'owned' },
			date_created: '2026-11-14T12:00:00Z',
			payment_status: 'free',
			payment_amount: 0,
			quantity: 1,
			participant_email: 'bia@example.com',
			payment_method: 'PIX',
		},
		{
			id: 'pending',
			event_id: { id: 'owned' },
			date_created: '2026-11-15T12:00:00Z',
			payment_status: 'pending',
			total_amount: 50,
		},
		{
			id: 'refunded',
			event_id: { id: 'second' },
			date_created: '2026-11-16T12:00:00Z',
			payment_status: 'refunded',
			payment_method: 'CARD',
		},
		{
			id: 'previous',
			event_id: { id: 'owned' },
			date_created: '2026-11-08T12:00:00Z',
			payment_status: 'paid',
			payment_amount: 50,
			quantity: 1,
			check_in_date: '2026-11-08T14:00:00Z',
		},
		{ id: 'missing-date' },
		{ id: 'unknown-status', date_created: '2026-11-15T12:00:00Z' },
	];
	it('counts only paid revenue in the selected period and excludes pending or refunded sales', async () => {
		const { service } = setup(rows);
		expect((await service.overview('owner', { date_from: '2026-11-10', date_to: '2026-11-17' })).metrics).toMatchObject(
			{ gross: 110, net: 98, serviceFees: 12, ticketsSold: 2, pendingCount: 1, refundedCount: 1 },
		);
		expect((await service.overview('owner', { date_from: '2030-01-01' })).metrics).toMatchObject({
			gross: 0,
			averageTicket: 0,
		});
	});
	it('filters transaction searches within the owner registrations before querying payments', async () => {
		const { service, repository } = setup(rows);
		const query = { page: 1, limit: 20, sort_direction: 'desc' as const, event_id: 'owned', search: 'ANA' };
		vi.mocked(repository.listTransactions).mockResolvedValue({ data: [{ id: 'payment' }], total: 1 });
		expect((await service.transactions('owner', query)).data).toEqual([{ id: 'payment' }]);
		expect(repository.listTransactions).toHaveBeenCalledWith(['paid'], expect.objectContaining({ limit: 20 }));
		vi.mocked(repository.listTransactions).mockClear();
		expect((await service.transactions('owner', { ...query, event_id: 'foreign' })).data).toEqual([]);
		expect(repository.listTransactions).not.toHaveBeenCalled();
		await service.transactions('owner', { page: 2, limit: 10, sort_direction: 'asc' });
		expect(repository.listTransactions).toHaveBeenCalledWith(
			rows.map((row) => row.id),
			expect.objectContaining({ page: 2 }),
		);
	});
	it.each(['mock', 'abacatepay'])('reserves pending payouts in the %s available balance', async (provider) => {
		const { repository } = setup(rows);
		vi.mocked(repository.listSucceededTransactionNets).mockResolvedValue([600, 400]);
		vi.mocked(repository.listPayouts).mockResolvedValue([
			{ id: 'a', amount: 100, status: 'completed' },
			{ id: 'b', amount: 200, status: 'processing' },
			{ id: 'c', amount: 150, status: 'pending' },
			{ id: 'd', amount: 50, status: 'failed', failure_reason: 'Recusado' },
		]);
		const service = new FinanceService(repository, provider);
		expect((await service.payouts('owner', 'enabled')).balance).toEqual({
			available: 550,
			pending: 350,
			currency: 'brl',
		});
		expect((await service.payouts('owner', 'blocked')).alert).toBeTruthy();
	});
	it('builds analytics without treating pending payments as sales, and accounts for installments and check-ins', async () => {
		const { service, repository } = setup(rows);
		vi.mocked(repository.listEvents).mockResolvedValue([
			{ id: 'owned', title: 'Principal', status: 'published' },
			{ id: 'second', title: 'Segundo', status: 'draft' },
			{ id: 'third', title: 'Terceiro', status: 'published' },
			{ id: 'empty', title: 'Vazio', status: 'draft' },
			{ id: 'archived', title: 'Antigo', status: 'archived' },
		]);
		vi.mocked(repository.listTickets).mockResolvedValue([
			{ id: 't1', event_id: 'owned', title: 'VIP', quantity: 10, quantity_sold: 5, price: 50 },
			{ id: 't2', event_id: 'second', title: 'Normal', quantity: 10, quantity_sold: 2 },
			{ id: 't3', event_id: 'third', title: 'Livre', quantity: 10, quantity_sold: 1 },
			{ id: 't4', event_id: 'empty', title: 'Novo' },
		]);
		vi.mocked(repository.listInstallments).mockResolvedValue([
			{ status: 'paid', amount: 20, due_date: '2026-11-10' },
			{ status: 'paid', amount: 10, due_date: '2026-11-11' },
			{ status: 'pending', amount: 30, due_date: '2026-11-16' },
			{ status: 'pending', amount: 40, due_date: '2026-11-18' },
			{ status: 'overdue', amount: 50, due_date: '2026-11-15' },
			{ status: 'pending', due_date: '2026-12-30' },
		]);
		const result = await service.analytics('owner', { start_date: '2026-11-10', end_date: '2026-11-17' });
		expect(result.kpi).toMatchObject({
			totalRevenue: 100,
			ticketsSold: 3,
			uniqueParticipants: 2,
			checkinRate: 50,
			revenueChange: 100,
		});
		expect(result.installments.alerts).toEqual([
			{ type: 'overdue', count: 2, amount: 80 },
			{ type: 'upcoming', count: 1, amount: 40 },
		]);
		expect(result.activeEvents.map((event) => event.status)).toEqual(['active', 'slow', 'critical', 'critical']);
		expect(result.checkinHeatmap.reduce((sum, row) => sum + row.count, 0)).toBe(1);
		expect((await service.listEvents('owner')).data).toHaveLength(5);
	});
});
