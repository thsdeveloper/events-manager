import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireOrganizer } from '../application/auth/organizer-context.js';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import type { ApiEnv } from '../config/env.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';

async function getFinanceRows(clients: SupabaseClients, organizerId: string) {
  const { data, error } = await clients.admin
    .from('event_registrations')
    .select('*,event_id:events!inner(id,title,organizer_id),ticket_type_id:event_tickets(id,title)')
    .eq('event_id.organizer_id', organizerId);
  if (error) throw error;
  return data ?? [];
}

export async function financeRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients; payments: PaymentGateway }) {
  const { env, clients, payments } = options;

  app.get('/api/organizer/finance/events', async (request) => {
    const context = await requireOrganizer(request, clients);
    const { data, error } = await clients.admin.from('events').select('id,title').eq('organizer_id', context.organizer.id).order('title');
    if (error) throw error;
    return { data: data ?? [] };
  });

  app.get('/api/organizer/finance/overview', async (request) => {
    const context = await requireOrganizer(request, clients);
    const query = z.object({ date_from: z.string().optional(), date_to: z.string().optional(), range: z.string().optional() }).parse(request.query);
    const rows = (await getFinanceRows(clients, context.organizer.id)).filter((row: any) => {
      const timestamp = new Date(row.date_created).getTime();
      return (!query.date_from || timestamp >= new Date(query.date_from).getTime()) && (!query.date_to || timestamp <= new Date(query.date_to).getTime());
    });
    const paid = rows.filter((row: any) => row.payment_status === 'paid');
    const gross = paid.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0);
    const serviceFees = paid.reduce((sum: number, row: any) => sum + Number(row.platform_fee ?? 0) + Number(row.provider_fee ?? 0), 0);
    const net = paid.reduce((sum: number, row: any) => sum + Math.max(0, Number(row.payment_amount ?? 0) - Number(row.provider_fee ?? 0) - (Number(row.total_amount ?? 0) > Number(row.payment_amount ?? 0) ? 0 : Number(row.platform_fee ?? 0))), 0);
    const totalTransactions = paid.length;
    return { metrics: { gross, serviceFees, net, ticketsSold: paid.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 0), 0), totalTransactions, averageTicket: totalTransactions ? gross / totalTransactions : 0, pendingCount: rows.filter((row: any) => row.payment_status === 'pending').length, refundedCount: rows.filter((row: any) => row.payment_status === 'refunded').length, allRegistrations: rows.length, allGross: rows.reduce((sum: number, row: any) => sum + Number(row.total_amount ?? 0), 0) } };
  });

  app.get('/api/organizer/finance/transactions', async (request) => {
    const context = await requireOrganizer(request, clients);
    const query = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), status: z.string().optional(), event_id: z.string().optional(), search: z.string().optional(), date_from: z.string().optional(), date_to: z.string().optional(), sort_direction: z.enum(['asc', 'desc']).default('desc') }).parse(request.query);
    let registrations = await getFinanceRows(clients, context.organizer.id);
    registrations = registrations.filter((row: any) => (!query.event_id || row.event_id.id === query.event_id) && (!query.search || `${row.participant_name} ${row.participant_email}`.toLowerCase().includes(query.search.toLowerCase())));
    const ids = registrations.map((row: any) => row.id);
    if (!ids.length) return { data: [], pagination: { page: query.page, limit: query.limit, total: 0, pageCount: 0 }, summary: { status: {} } };
    let builder = clients.admin.from('payment_transactions').select('*,registration_id:event_registrations(*,event_id:events(id,title),ticket_type_id:event_tickets(id,title))', { count: 'exact' }).in('registration_id', ids);
    if (query.status) builder = builder.eq('status', query.status);
    if (query.date_from) builder = builder.gte('date_created', query.date_from);
    if (query.date_to) builder = builder.lte('date_created', query.date_to);
    const from = (query.page - 1) * query.limit;
    const { data, count, error } = await builder.order('date_created', { ascending: query.sort_direction === 'asc' }).range(from, from + query.limit - 1);
    if (error) throw error;
    return { data: data ?? [], pagination: { page: query.page, limit: query.limit, total: count ?? 0, pageCount: Math.ceil((count ?? 0) / query.limit) }, summary: { status: {} } };
  });

  app.get('/api/organizer/finance/payouts', async (request) => {
    const context = await requireOrganizer(request, clients);
    const { data: events, error: eventsError } = await clients.admin
      .from('events')
      .select('id')
      .eq('organizer_id', context.organizer.id);
    if (eventsError) throw eventsError;
    const eventIds = (events ?? []).map((event) => event.id);
    const { data: registrations, error: registrationsError } = eventIds.length
      ? await clients.admin.from('event_registrations').select('id').in('event_id', eventIds)
      : { data: [], error: null };
    if (registrationsError) throw registrationsError;
    const registrationIds = (registrations ?? []).map((registration) => registration.id);
    const [transactionResult, payoutResult] = await Promise.all([
      registrationIds.length
        ? clients.admin.from('payment_transactions').select('organizer_net').in('registration_id', registrationIds).eq('status', 'succeeded')
        : Promise.resolve({ data: [], error: null }),
      clients.admin.from('organizer_payouts').select('*').eq('organizer_id', context.organizer.id).order('requested_at', { ascending: false }).limit(25),
    ]);
    if (transactionResult.error) throw transactionResult.error;
    if (payoutResult.error) throw payoutResult.error;
    const earned = (transactionResult.data ?? []).reduce((sum, transaction) => sum + Number(transaction.organizer_net ?? 0), 0);
    const completed = (payoutResult.data ?? []).filter((payout) => payout.status === 'completed').reduce((sum, payout) => sum + Number(payout.amount), 0);
    const pending = (payoutResult.data ?? []).filter((payout) => payout.status === 'pending' || payout.status === 'processing').reduce((sum, payout) => sum + Number(payout.amount), 0);
    const alert = payments.provider === 'mock'
      ? 'Ambiente local: pagamentos e repasses são simulados.'
      : context.organizer.payout_status !== 'enabled'
        ? 'Cadastre e valide sua chave PIX para receber repasses.'
        : undefined;
    return {
      balance: { available: Math.max(0, earned - completed - pending), pending, currency: 'brl' },
      payouts: (payoutResult.data ?? []).map((payout) => ({
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
      payoutStatus: context.organizer.payout_status,
      provider: payments.provider,
    };
  });

  app.get('/api/organizer/analytics', async (request) => {
    const context = await requireOrganizer(request, clients);
    const query = z.object({
      start_date: z.string().optional(),
      end_date: z.string().optional(),
      event_id: z.string().uuid().optional(),
    }).parse(request.query);
    const allRows = await getFinanceRows(clients, context.organizer.id);
    const start = query.start_date ? new Date(query.start_date) : new Date(Date.now() - 29 * 86_400_000);
    const end = query.end_date ? new Date(query.end_date) : new Date();
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
    const inWindow = (row: any) => {
      const created = new Date(row.date_created).getTime();
      return created >= start.getTime() && created <= end.getTime() && (!query.event_id || row.event_id?.id === query.event_id);
    };
    const rows = allRows.filter(inWindow);
    const paid = rows.filter((row: any) => row.payment_status === 'paid' || row.payment_status === 'free');
    const eventIds = [...new Set((query.event_id ? [query.event_id] : allRows.map((row: any) => row.event_id?.id)).filter(Boolean))];
    const { data: events, error: eventsError } = await clients.admin
      .from('events')
      .select('id,title,start_date,status')
      .eq('organizer_id', context.organizer.id)
      .order('start_date', { ascending: true });
    if (eventsError) throw eventsError;
    const { data: tickets, error: ticketsError } = eventIds.length
      ? await clients.admin.from('event_tickets').select('*').in('event_id', eventIds)
      : { data: [], error: null };
    if (ticketsError) throw ticketsError;
    const registrationIds = rows.map((row: any) => row.id);
    const { data: installments, error: installmentsError } = registrationIds.length
      ? await clients.admin.from('payment_installments').select('*').in('registration_id', registrationIds)
      : { data: [], error: null };
    if (installmentsError) throw installmentsError;

    const totalRevenue = paid.reduce((sum: number, row: any) => sum + Number(row.payment_amount ?? 0), 0);
    const checkedIn = paid.filter((row: any) => row.check_in_date).length;
    const periodMs = Math.max(end.getTime() - start.getTime(), 86_400_000);
    const previousStart = new Date(start.getTime() - periodMs);
    const previousEnd = new Date(start.getTime() - 1);
    const previousPaid = allRows.filter((row: any) => {
      const created = new Date(row.date_created).getTime();
      return created >= previousStart.getTime() && created <= previousEnd.getTime() &&
        (!query.event_id || row.event_id?.id === query.event_id) &&
        (row.payment_status === 'paid' || row.payment_status === 'free');
    });
    const previousRevenue = previousPaid.reduce((sum: number, row: any) => sum + Number(row.payment_amount ?? 0), 0);
    const checkinRate = paid.length ? (checkedIn / paid.length) * 100 : 0;
    const previousRate = previousPaid.length ? (previousPaid.filter((row: any) => row.check_in_date).length / previousPaid.length) * 100 : 0;
    const percentageChange = (current: number, previous: number) => previous ? ((current - previous) / previous) * 100 : 0;

    const salesMap = new Map<string, { revenue: number; tickets: number }>();
    for (const row of paid as any[]) {
      const day = new Date(row.date_created).toISOString().slice(0, 10);
      const current = salesMap.get(day) ?? { revenue: 0, tickets: 0 };
      current.revenue += Number(row.payment_amount ?? 0);
      current.tickets += Number(row.quantity ?? 1);
      salesMap.set(day, current);
    }
    const sales = Array.from(salesMap, ([date, value]) => ({ date, ...value })).sort((a, b) => a.date.localeCompare(b.date));

    const statusMap = new Map<string, { count: number; value: number }>();
    const methodMap = new Map<string, { count: number; revenue: number }>();
    for (const row of rows as any[]) {
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
    const paymentStatus = Array.from(statusMap, ([status, value]) => ({
      status,
      ...value,
      percentage: rows.length ? (value.count / rows.length) * 100 : 0,
    }));
    const paymentMethods = Array.from(methodMap, ([method, value]) => ({ method, ...value }));

    const ticketPerformance = (tickets ?? []).map((ticket: any) => {
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
    });

    const installmentMap = new Map<string, { count: number; totalAmount: number; receivedAmount: number; pendingAmount: number }>();
    for (const installment of installments ?? []) {
      const value = installmentMap.get(installment.status) ?? { count: 0, totalAmount: 0, receivedAmount: 0, pendingAmount: 0 };
      const amount = Number(installment.amount ?? 0);
      value.count += 1;
      value.totalAmount += amount;
      if (installment.status === 'paid') value.receivedAmount += amount;
      else value.pendingAmount += amount;
      installmentMap.set(installment.status, value);
    }
    const installmentData = Array.from(installmentMap, ([status, value]) => ({ status, ...value }));
    const now = Date.now();
    const installmentAlerts = ['overdue', 'upcoming', 'defaulted'].map((type) => {
      const matching = (installments ?? []).filter((item: any) => {
        const due = new Date(item.due_date).getTime();
        if (type === 'overdue') return item.status === 'overdue' || (item.status === 'pending' && due < now);
        if (type === 'upcoming') return item.status === 'pending' && due >= now && due <= now + 7 * 86_400_000;
        return false;
      });
      return { type, count: matching.length, amount: matching.reduce((sum: number, item: any) => sum + Number(item.amount ?? 0), 0) };
    }).filter((alert) => alert.count > 0);

    const hourMap = new Map<number, number>();
    for (const row of paid as any[]) if (row.check_in_date) {
      const hour = new Date(row.check_in_date).getHours();
      hourMap.set(hour, (hourMap.get(hour) ?? 0) + 1);
    }
    const totalCheckins = Array.from(hourMap.values()).reduce((sum, count) => sum + count, 0);
    const checkinHeatmap = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${String(hour).padStart(2, '0')}:00`,
      count: hourMap.get(hour) ?? 0,
      percentage: totalCheckins ? ((hourMap.get(hour) ?? 0) / totalCheckins) * 100 : 0,
    }));

    const activeEvents = (events ?? []).filter((event: any) => event.status === 'published' || event.status === 'draft').map((event: any) => {
      const eventTickets = (tickets ?? []).filter((ticket: any) => ticket.event_id === event.id);
      const ticketsSold = eventTickets.reduce((sum: number, ticket: any) => sum + Number(ticket.quantity_sold ?? 0), 0);
      const ticketsTotal = eventTickets.reduce((sum: number, ticket: any) => sum + Number(ticket.quantity ?? 0), 0);
      const rate = ticketsTotal ? (ticketsSold / ticketsTotal) * 100 : 0;
      const revenue = paid.filter((row: any) => row.event_id?.id === event.id).reduce((sum: number, row: any) => sum + Number(row.payment_amount ?? 0), 0);
      return { id: event.id, title: event.title, startDate: event.start_date, ticketsSold, ticketsTotal, revenue, status: rate >= 50 ? 'active' : rate >= 20 ? 'slow' : 'critical' };
    });

    return {
      kpi: {
        totalRevenue,
        revenueChange: percentageChange(totalRevenue, previousRevenue),
        ticketsSold: paid.reduce((sum: number, row: any) => sum + Number(row.quantity ?? 1), 0),
        ticketsTotal: (tickets ?? []).reduce((sum: number, ticket: any) => sum + Number(ticket.quantity ?? 0), 0),
        uniqueParticipants: new Set(paid.map((row: any) => row.participant_email)).size,
        checkinRate,
        checkinChange: percentageChange(checkinRate, previousRate),
      },
      sales,
      paymentStatus,
      paymentMethods,
      ticketPerformance,
      installments: { data: installmentData, alerts: installmentAlerts },
      checkinHeatmap,
      activeEvents,
    };
  });

  app.get('/api/organizer/finance/export', async (request, reply) => {
    const context = await requireOrganizer(request, clients);
    const rows = await getFinanceRows(clients, context.organizer.id);
    const csv = ['Data,Evento,Participante,Email,Status,Bruto,Taxas,Líquido', ...rows.map((row: any) => [row.date_created, row.event_id?.title, row.participant_name, row.participant_email, row.payment_status, row.total_amount, row.service_fee, row.payment_amount].map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(','))].join('\n');
    return reply.type('text/csv; charset=utf-8').header('content-disposition', 'attachment; filename="financeiro.csv"').send(`\uFEFF${csv}`);
  });
}
