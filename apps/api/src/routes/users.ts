import { checkoutAttendeeSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DeliverTickets } from '../application/tickets/deliver-tickets.js';
import { TicketService } from '../application/tickets/ticket-service.js';
import { UserService } from '../application/users/user-service.js';
import type { ApiEnv } from '../config/env.js';
import { createEmailService } from '../infrastructure/email/create-email-service.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseTicketDeliveryRepository } from '../infrastructure/supabase/ticket-delivery-repository.js';
import { SupabaseTicketRepository } from '../infrastructure/supabase/ticket-repository.js';
import { SupabaseUserRepository } from '../infrastructure/supabase/user-repository.js';
import { requireUser } from './auth-context.js';

export async function userRoutes(app: FastifyInstance, options: { clients: SupabaseClients; env: ApiEnv }) {
	const { clients, env } = options;
	const auth = createSupabaseAuthService(clients);
	const service = new UserService(new SupabaseUserRepository(clients));
	const tickets = new TicketService(
		new SupabaseTicketRepository(clients),
		new DeliverTickets(
			new SupabaseTicketDeliveryRepository(clients.admin),
			createEmailService(env, clients).email,
			app.log,
		),
	);

	// Ingressos nominais: os que a pessoa comprou e os que outra pessoa comprou
	// em nome dela (pelo e-mail da conta).
	app.get('/api/user/tickets', async (request) => {
		const context = await requireUser(request, auth);
		return tickets.listForUser(context.user.id, context.user.email ?? '');
	});

	app.patch('/api/user/tickets/:id/attendee', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return tickets.nameAttendee(context.user.id, id, checkoutAttendeeSchema.parse(request.body));
	});

	app.get('/api/user/transactions', async (request) => {
		const context = await requireUser(request, auth);
		return service.listTransactions(context.user.id);
	});

	app.get('/api/my-registrations/pending-payments', async (request) => {
		const context = await requireUser(request, auth);
		return service.listPendingPayments(context.user.id);
	});
}
