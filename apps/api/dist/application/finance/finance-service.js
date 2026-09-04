export class FinanceService {
    repository;
    provider;
    now;
    constructor(repository, provider, now = Date.now) {
        this.repository = repository;
        this.provider = provider;
        this.now = now;
    }
    async listEvents(organizerId) {
        return { data: await this.repository.listEvents(organizerId) };
    }
    async overview(organizerId, query) {
        const rows = (await this.repository.listRegistrations(organizerId)).filter((row) => isWithin(row.date_created, query.date_from, query.date_to));
        const paid = rows.filter((row) => row.payment_status === 'paid');
        const gross = sum(paid, 'total_amount');
        const serviceFees = paid.reduce((total, row) => total + Number(row.platform_fee ?? 0) + Number(row.provider_fee ?? 0), 0);
        const net = paid.reduce((total, row) => total +
            Math.max(0, Number(row.payment_amount ?? 0) -
                Number(row.provider_fee ?? 0) -
                (Number(row.total_amount ?? 0) > Number(row.payment_amount ?? 0) ? 0 : Number(row.platform_fee ?? 0))), 0);
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
    async transactions(organizerId, query) {
        const normalizedSearch = query.search?.toLocaleLowerCase('pt-BR');
        const registrationIds = (await this.repository.listRegistrations(organizerId))
            .filter((row) => (!query.event_id || row.event_id?.id === query.event_id) &&
            (!normalizedSearch ||
                `${row.participant_name ?? ''} ${row.participant_email ?? ''}`
                    .toLocaleLowerCase('pt-BR')
                    .includes(normalizedSearch)))
            .map((row) => row.id);
        if (!registrationIds.length)
            return emptyPage(query.page, query.limit);
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
    async payouts(organizerId, payoutStatus) {
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
        const alert = this.provider === 'mock'
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
    async analytics(organizerId, query) {
        const allRows = await this.repository.listRegistrations(organizerId);
        const start = query.start_date ? new Date(query.start_date) : new Date(this.now() - 29 * 86_400_000);
        const end = query.end_date ? new Date(query.end_date) : new Date(this.now());
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        const rows = allRows.filter((row) => {
            const created = new Date(row.date_created ?? 0).getTime();
            return (created >= start.getTime() &&
                created <= end.getTime() &&
                (!query.event_id || row.event_id?.id === query.event_id));
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
            return (created >= previousStart.getTime() &&
                created <= previousEnd.getTime() &&
                (!query.event_id || row.event_id?.id === query.event_id) &&
                (row.payment_status === 'paid' || row.payment_status === 'free'));
        });
        const previousRevenue = sum(previousPaid, 'payment_amount');
        const checkinRate = paid.length ? (checkedIn / paid.length) * 100 : 0;
        const previousRate = previousPaid.length
            ? (previousPaid.filter((row) => row.check_in_date).length / previousPaid.length) * 100
            : 0;
        const salesMap = new Map();
        for (const row of paid) {
            const day = new Date(row.date_created ?? 0).toISOString().slice(0, 10);
            const value = salesMap.get(day) ?? { revenue: 0, tickets: 0 };
            value.revenue += Number(row.payment_amount ?? 0);
            value.tickets += Number(row.quantity ?? 1);
            salesMap.set(day, value);
        }
        const statusMap = new Map();
        const methodMap = new Map();
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
        const installmentMap = new Map();
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
            if (installment.status === 'paid')
                value.receivedAmount += amount;
            else
                value.pendingAmount += amount;
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
        const hourMap = new Map();
        for (const row of paid) {
            if (!row.check_in_date)
                continue;
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
    async exportCsv(organizerId) {
        const rows = await this.repository.listRegistrations(organizerId);
        return `\uFEFF${[
            'Data,Evento,Participante,Email,Status,Bruto,Taxas,Líquido',
            ...rows.map((row) => [
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
                .join(',')),
        ].join('\n')}`;
    }
}
function emptyPage(page, limit) {
    return { data: [], pagination: { page, limit, total: 0, pageCount: 0 }, summary: { status: {} } };
}
function isWithin(value, from, to) {
    const timestamp = new Date(value ?? 0).getTime();
    return (!from || timestamp >= new Date(from).getTime()) && (!to || timestamp <= new Date(to).getTime());
}
function isString(value) {
    return Boolean(value);
}
function sum(rows, key, fallback = 0) {
    return rows.reduce((total, row) => total + Number(row[key] ?? fallback), 0);
}
function percentageChange(current, previous) {
    return previous ? ((current - previous) / previous) * 100 : 0;
}
function eventSummary(event, tickets, paid) {
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
        revenue: sum(paid.filter((row) => row.event_id?.id === event.id), 'payment_amount'),
        status: rate >= 50 ? 'active' : rate >= 20 ? 'slow' : 'critical',
    };
}
function csvCell(value) {
    return `"${String(value ?? '').replaceAll('"', '""')}"`;
}
//# sourceMappingURL=finance-service.js.map