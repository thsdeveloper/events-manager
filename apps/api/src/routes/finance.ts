import { authorizedEventIds } from './iam-authorization.js';
import type { FastifyRequest } from 'fastify';
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
	event_id: z.string().uuid().optional(),
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
	const financeFor = (request: FastifyRequest) =>
		new FinanceService(new SupabaseFinanceRepository(clients, authorizedEventIds(request)), payments.provider);

	app.get('/api/organizer/finance/events', async (request) => {
		const context = await requireOrganizer(request, auth);
		return financeFor(request).listEvents(context.organizer.id, context.eventId ?? undefined);
	});

	app.get('/api/organizer/finance/overview', async (request) => {
		const context = await requireOrganizer(request, auth);
		return financeFor(request).overview(context.organizer.id, {
			...dateFilter.parse(request.query),
			...(context.eventId ? { event_id: context.eventId } : {}),
		});
	});

	app.get('/api/organizer/finance/transactions', async (request) => {
		const context = await requireOrganizer(request, auth);
		return financeFor(request).transactions(context.organizer.id, {
			...transactionFilter.parse(request.query),
			...(context.eventId ? { event_id: context.eventId } : {}),
		});
	});

	app.get('/api/organizer/finance/transactions/:id', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return financeFor(request).transaction(context.organizer.id, id, context.eventId ?? undefined);
	});

	app.get('/api/organizer/finance/payouts', async (request) => {
		const context = await requireOrganizer(request, auth);
		if (context.eventId) return { balance: null, payouts: [] };
		return financeFor(request).payouts(context.organizer.id, context.organizer.payout_status);
	});

	app.get('/api/organizer/analytics', async (request) => {
		const context = await requireOrganizer(request, auth);
		return financeFor(request).analytics(context.organizer.id, {
			...analyticsFilter.parse(request.query),
			...(context.eventId ? { event_id: context.eventId } : {}),
		});
	});

	app.get('/api/organizer/finance/export', async (request, reply) => {
		const context = await requireOrganizer(request, auth);
		return reply
			.type('text/csv; charset=utf-8')
			.header('content-disposition', 'attachment; filename="financeiro.csv"')
			.send(
				await financeFor(request).exportCsv(context.organizer.id, {
					...transactionFilter.parse(request.query),
					...(context.eventId ? { event_id: context.eventId } : {}),
				}),
			);
	});
}
