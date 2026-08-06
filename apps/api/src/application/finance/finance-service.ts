export interface FinanceEvent extends Record<string, unknown> {
	id: string;
	start_date?: string | null;
	status?: string | null;
	title: string;
}

export interface FinanceRegistration extends Record<string, unknown> {
	check_in_date?: string | null;
	date_created?: string | null;
	event_id?: { id: string; title?: string } | null;
	id: string;
	participant_email?: string | null;
	participant_name?: string | null;
	payment_amount?: number | null;
	payment_method?: string | null;
	payment_status?: string | null;
	platform_fee?: number | null;
	provider_fee?: number | null;
	quantity?: number | null;
	service_fee?: number | null;
	total_amount?: number | null;
}

export interface FinanceTicket extends Record<string, unknown> {
	event_id: string;
	id: string;
	price?: number | null;
	quantity?: number | null;
	quantity_sold?: number | null;
	status?: string | null;
	title: string;
}

export interface FinanceInstallment extends Record<string, unknown> {
	amount?: number | null;
	due_date: string;
	status: string;
}

export interface FinancePayout extends Record<string, unknown> {
	amount: number;
	failure_reason?: string | null;
	id: string;
	processed_at?: string | null;
	receipt_url?: string | null;
	requested_at?: string | null;
	status: string;
}

export interface FinanceRepository {
	listEvents(organizerId: string): Promise<FinanceEvent[]>;
	listInstallments(registrationIds: string[]): Promise<FinanceInstallment[]>;
	listPayouts(organizerId: string): Promise<FinancePayout[]>;
	listRegistrations(organizerId: string): Promise<FinanceRegistration[]>;
	listSucceededTransactionNets(registrationIds: string[]): Promise<number[]>;
	listTickets(eventIds: string[]): Promise<FinanceTicket[]>;
	listTransactions(
		registrationIds: string[],
		query: {
			dateFrom?: string;
			dateTo?: string;
			limit: number;
			page: number;
			sortDirection: 'asc' | 'desc';
			status?: string;
		},
	): Promise<{ data: unknown[]; total: number }>;
}

export interface FinanceDateFilter {
	date_from?: string;
	date_to?: string;
}

export interface FinanceTransactionFilter extends FinanceDateFilter {
	event_id?: string;
	limit: number;
	page: number;
	search?: string;
	sort_direction: 'asc' | 'desc';
	status?: string;
}

export interface FinanceAnalyticsFilter {
	end_date?: string;
	event_id?: string;
	start_date?: string;
}

export class FinanceService {
	constructor(
		private readonly repository: FinanceRepository,
		private readonly provider: string,
		private readonly now: () => number = Date.now,
	) {}

	async listEvents(organizerId: string) {
		return { data: await this.repository.listEvents(organizerId) };
	}

	async overview(organizerId: string, query: FinanceDateFilter) {
		const rows = (await this.repository.listRegistrations(organizerId)).filter((row) =>
			isWithin(row.date_created, query.date_from, query.date_to),
		);
		const paid = rows.filter((row) => row.payment_status === 'paid');
		const gross = sum(paid, 'total_amount');
		const serviceFees = paid.reduce(
			(total, row) => total + Number(row.platform_fee ?? 0) + Number(row.provider_fee ?? 0),
			0,
		);
		const net = paid.reduce(
			(total, row) =>
				total +
				Math.max(
					0,
					Number(row.payment_amount ?? 0) -
						Number(row.provider_fee ?? 0) -
						(Number(row.total_amount ?? 0) > Number(row.payment_amount ?? 0) ? 0 : Number(row.platform_fee ?? 0)),
				),
			0,
		);
		return {
			metrics: {
				gross,
				serviceFees,
				net,
				ticketsSold: sum(paid, 'quantity'),
				totalTransactions: paid.length,
				averageTicket: paid.length ? gross / paid.length : 0,
				pendingCount: rows.filter((row) => row.payment_status === 'pending').length,
				refundedCount: rows.filter((row) => row.payment_status === 'refunded').length,
				allRegistrations: rows.length,
				allGross: sum(rows, 'total_amount'),
			},
		};
	}

	async transactions(organizerId: string, query: FinanceTransactionFilter) {
		const normalizedSearch = query.search?.toLocaleLowerCase('pt-BR');
		const registrationIds = (await this.repository.listRegistrations(organizerId))
			.filter(
				(row) =>
					(!query.event_id || row.event_id?.id === query.event_id) &&
					(!normalizedSearch ||
						`${row.participant_name ?? ''} ${row.participant_email ?? ''}`
							.toLocaleLowerCase('pt-BR')
							.includes(normalizedSearch)),
			)
			.map((row) => row.id);
		if (!registrationIds.length) return emptyPage(query.page, query.limit);
		const result = await this.repository.listTransactions(registrationIds, {
			dateFrom: query.date_from,
			dateTo: query.date_to,
			limit: query.limit,
			page: query.page,
			sortDirection: query.sort_direction,
			status: query.status,
		});
		return {
			data: result.data,
			pagination: {
				page: query.page,
				limit: query.limit,
				total: result.total,
				pageCount: Math.ceil(result.total / query.limit),
			},
			summary: { status: {} },
		};
	}

	async payouts(organizerId: string, payoutStatus: unknown) {
		const registrations = await this.repository.listRegistrations(organizerId);
		const [nets, payouts] = await Promise.all([
			this.repository.listSucceededTransactionNets(registrations.map((row) => row.id)),
			this.repository.listPayouts(organizerId),
		]);
		const earned = nets.reduce((total, value) => total + value, 0);
		const completed = payouts
			.filter((payout) => payout.status === 'completed')
			.reduce((total, payout) => total + Number(payout.amount), 0);
		const pending = payouts
			.filter((payout) => payout.status === 'pending' || payout.status === 'processing')
			.reduce((total, payout) => total + Number(payout.amount), 0);
		const alert =
			this.provider === 'mock'
				? 'Ambiente local: pagamentos e repasses são simulados.'
				: payoutStatus !== 'enabled'
					? 'Cadastre e valide sua chave PIX para receber repasses.'
					: undefined;
		return {
			balance: { available: Math.max(0, earned - completed - pending), pending, currency: 'brl' },
			payouts: payouts.map((payout) => ({
				id: payout.id,
				amount: Number(payout.amount),
				currency: 'brl',
				status: payout.status,
				createdAt: payout.requested_at,
				arrivalDate: payout.processed_at,
				description: payout.failure_reason ?? 'Repasse via PIX',
				receiptUrl: payout.receipt_url,
			})),
			alert,
			payoutStatus,
			provider: this.provider,
		};
	}

	async analytics(organizerId: string, query: FinanceAnalyticsFilter) {
		const allRows = await this.repository.listRegistrations(organizerId);
		const start = query.start_date ? new Date(query.start_date) : new Date(this.now() - 29 * 86_400_000);
		const end = query.end_date ? new Date(query.end_date) : new Date(this.now());
		start.setHours(0, 0, 0, 0);
		end.setHours(23, 59, 59, 999);
		const rows = allRows.filter((row) => {
			const created = new Date(row.date_created ?? 0).getTime();
			return (
				created >= start.getTime() &&
				created <= end.getTime() &&
				(!query.event_id || row.event_id?.id === query.event_id)
			);
		});
		const paid = rows.filter((row) => row.payment_status === 'paid' || row.payment_status === 'free');
		const eventIds = [
			...new Set((query.event_id ? [query.event_id] : allRows.map((row) => row.event_id?.id)).filter(isString)),
		];
		const [events, tickets, installments] = await Promise.all([
			this.repository.listEvents(organizerId),
			this.repository.listTickets(eventIds),
			this.repository.listInstallments(rows.map((row) => row.id)),
		]);

		const totalRevenue = sum(paid, 'payment_amount');
		const checkedIn = paid.filter((row) => row.check_in_date).length;
		const periodMs = Math.max(end.getTime() - start.getTime(), 86_400_000);
		const previousStart = new Date(start.getTime() - periodMs);
		const previousEnd = new Date(start.getTime() - 1);
		const previousPaid = allRows.filter((row) => {
			const created = new Date(row.date_created ?? 0).getTime();
			return (
				created >= previousStart.getTime() &&
				created <= previousEnd.getTime() &&
				(!query.event_id || row.event_id?.id === query.event_id) &&
				(row.payment_status === 'paid' || row.payment_status === 'free')
			);
		});
		const previousRevenue = sum(previousPaid, 'payment_amount');
		const checkinRate = paid.length ? (checkedIn / paid.length) * 100 : 0;
		const previousRate = previousPaid.length
			? (previousPaid.filter((row) => row.check_in_date).length / previousPaid.length) * 100
			: 0;

		const salesMap = new Map<string, { revenue: number; tickets: number }>();
		for (const row of paid) {
			const day = new Date(row.date_created ?? 0).toISOString().slice(0, 10);
			const value = salesMap.get(day) ?? { revenue: 0, tickets: 0 };
			value.revenue += Number(row.payment_amount ?? 0);
			value.tickets += Number(row.quantity ?? 1);
			salesMap.set(day, value);
		}

		const statusMap = new Map<string, { count: number; value: number }>();
		const methodMap = new Map<string, { count: number; revenue: number }>();
		for (const row of rows) {
			const status = row.payment_status ?? 'pending';
			const statusValue = statusMap.get(status) ?? { count: 0, value: 0 };
			statusValue.count += 1;
			statusValue.value += Number(row.payment_amount ?? 0);
			statusMap.set(status, statusValue);
			const method = row.payment_method ?? 'não informado';
			const methodValue = methodMap.get(method) ?? { count: 0, revenue: 0 };
			methodValue.count += 1;
			methodValue.revenue += Number(row.payment_amount ?? 0);
			methodMap.set(method, methodValue);
		}

		const installmentMap = new Map<
			string,
			{ count: number; totalAmount: number; receivedAmount: number; pendingAmount: number }
		>();
		for (const installment of installments) {
			const value = installmentMap.get(installment.status) ?? {
				count: 0,
				totalAmount: 0,
				receivedAmount: 0,
				pendingAmount: 0,
			};
			const amount = Number(installment.amount ?? 0);
			value.count += 1;
			value.totalAmount += amount;
			if (installment.status === 'paid') value.receivedAmount += amount;
			else value.pendingAmount += amount;
			installmentMap.set(installment.status, value);
		}

		const installmentAlerts = ['overdue', 'upcoming']
			.map((type) => {
				const matching = installments.filter((item) => {
					const due = new Date(item.due_date).getTime();
					return type === 'overdue'
						? item.status === 'overdue' || (item.status === 'pending' && due < this.now())
						: item.status === 'pending' && due >= this.now() && due <= this.now() + 7 * 86_400_000;
				});
				return { type, count: matching.length, amount: sum(matching, 'amount') };
			})
			.filter((alert) => alert.count > 0);

		const hourMap = new Map<number, number>();
		for (const row of paid) {
			if (!row.check_in_date) continue;
			const hour = new Date(row.check_in_date).getHours();
			hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
		}
		const totalCheckins = [...hourMap.values()].reduce((total, count) => total + count, 0);
		return {
			kpi: {
				totalRevenue,
				revenueChange: percentageChange(totalRevenue, previousRevenue),
				ticketsSold: sum(paid, 'quantity', 1),
				ticketsTotal: sum(tickets, 'quantity'),
				uniqueParticipants: new Set(paid.map((row) => row.participant_email)).size,
				checkinRate,
				checkinChange: percentageChange(checkinRate, previousRate),
			},
			sales: [...salesMap].map(([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date)),
			paymentStatus: [...statusMap].map(([status, value]) => ({
				status,
				...value,
				percentage: rows.length ? (value.count / rows.length) * 100 : 0,
			})),
			paymentMethods: [...methodMap].map(([method, value]) => ({ method, ...value })),
			ticketPerformance: tickets.map((ticket) => {
				const sold = Number(ticket.quantity_sold ?? 0);
				const total = Number(ticket.quantity ?? 0);
				return {
					id: ticket.id,
					title: ticket.title,
					sold,
					total,
					revenue: sold * Number(ticket.price ?? 0),
					conversionRate: total ? (sold / total) * 100 : 0,
					status: ticket.status,
				};
			}),
			installments: {
				data: [...installmentMap].map(([status, value]) => ({ status, ...value })),
				alerts: installmentAlerts,
			},
			checkinHeatmap: Array.from({ length: 24 }, (_, hour) => ({
				hour: `${String(hour).padStart(2, '0')}:00`,
				count: hourMap.get(hour) ?? 0,
				percentage: totalCheckins ? ((hourMap.get(hour) ?? 0) / totalCheckins) * 100 : 0,
			})),
			activeEvents: events
				.filter((event) => event.status === 'published' || event.status === 'draft')
				.map((event) => eventSummary(event, tickets, paid)),
		};
	}

	async exportCsv(organizerId: string) {
		const rows = await this.repository.listRegistrations(organizerId);
		return `\uFEFF${[
			'Data,Evento,Participante,Email,Status,Bruto,Taxas,Líquido',
			...rows.map((row) =>
				[
					row.date_created,
					row.event_id?.title,
					row.participant_name,
					row.participant_email,
					row.payment_status,
					row.total_amount,
					row.service_fee,
					row.payment_amount,
				]
					.map(csvCell)
					.join(','),
			),
		].join('\n')}`;
	}
}

function emptyPage(page: number, limit: number) {
	return { data: [], pagination: { page, limit, total: 0, pageCount: 0 }, summary: { status: {} } };
}

function isWithin(value?: string | null, from?: string, to?: string) {
	const timestamp = new Date(value ?? 0).getTime();
	return (!from || timestamp >= new Date(from).getTime()) && (!to || timestamp <= new Date(to).getTime());
}

function isString(value: string | undefined): value is string {
	return Boolean(value);
}

function sum<T extends Record<string, unknown>>(rows: T[], key: keyof T, fallback = 0) {
	return rows.reduce((total, row) => total + Number(row[key] ?? fallback), 0);
}

function percentageChange(current: number, previous: number) {
	return previous ? ((current - previous) / previous) * 100 : 0;
}

function eventSummary(event: FinanceEvent, tickets: FinanceTicket[], paid: FinanceRegistration[]) {
	const eventTickets = tickets.filter((ticket) => ticket.event_id === event.id);
	const ticketsSold = sum(eventTickets, 'quantity_sold');
	const ticketsTotal = sum(eventTickets, 'quantity');
	const rate = ticketsTotal ? (ticketsSold / ticketsTotal) * 100 : 0;
	return {
		id: event.id,
		title: event.title,
		startDate: event.start_date,
		ticketsSold,
		ticketsTotal,
		revenue: sum(
			paid.filter((row) => row.event_id?.id === event.id),
			'payment_amount',
		),
		status: rate >= 50 ? 'active' : rate >= 20 ? 'slow' : 'critical',
	};
}

function csvCell(value: unknown) {
	return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
