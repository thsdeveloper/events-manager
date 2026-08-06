import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { FinanceService } from '../application/finance/finance-service.js';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import type { ApiEnv } from '../config/env.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseFinanceRepository } from '../infrastructure/supabase/finance-repository.js';
import { requireOrganizer } from './auth-context.js';

const dateFilter = z.object({
	date_from: z.string().optional(),
	date_to: z.string().optional(),
	range: z.string().optional(),
});
const transactionFilter = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	status: z.string().optional(),
	event_id: z.string().optional(),
	search: z.string().optional(),
	date_from: z.string().optional(),
	date_to: z.string().optional(),
	sort_direction: z.enum(['asc', 'desc']).default('desc'),
});
const analyticsFilter = z.object({
	start_date: z.string().optional(),
	end_date: z.string().optional(),
	event_id: z.string().uuid().optional(),
});

export async function financeRoutes(
	app: FastifyInstance,
	options: { env: ApiEnv; clients: SupabaseClients; payments: PaymentGateway },
) {
	const { clients, payments } = options;
	const auth = createSupabaseAuthService(clients);
	const finance = new FinanceService(new SupabaseFinanceRepository(clients), payments.provider);

	app.get('/api/organizer/finance/events', async (request) => {
		const context = await requireOrganizer(request, auth);
		return finance.listEvents(context.organizer.id);
	});

	app.get('/api/organizer/finance/overview', async (request) => {
		const context = await requireOrganizer(request, auth);
		return finance.overview(context.organizer.id, dateFilter.parse(request.query));
	});

	app.get('/api/organizer/finance/transactions', async (request) => {
		const context = await requireOrganizer(request, auth);
		return finance.transactions(context.organizer.id, transactionFilter.parse(request.query));
	});

	app.get('/api/organizer/finance/payouts', async (request) => {
		const context = await requireOrganizer(request, auth);
		return finance.payouts(context.organizer.id, context.organizer.payout_status);
	});

	app.get('/api/organizer/analytics', async (request) => {
		const context = await requireOrganizer(request, auth);
		return finance.analytics(context.organizer.id, analyticsFilter.parse(request.query));
	});

	app.get('/api/organizer/finance/export', async (request, reply) => {
		const context = await requireOrganizer(request, auth);
		return reply
			.type('text/csv; charset=utf-8')
			.header('content-disposition', 'attachment; filename="financeiro.csv"')
			.send(await finance.exportCsv(context.organizer.id));
	});
}
