import type { FastifyInstance } from 'fastify';
import { UserService } from '../application/users/user-service.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseUserRepository } from '../infrastructure/supabase/user-repository.js';
import { requireUser } from './auth-context.js';

export async function userRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
	const { clients } = options;
	const auth = createSupabaseAuthService(clients);
	const service = new UserService(new SupabaseUserRepository(clients));

	app.get('/api/user/tickets', async (request) => {
		const context = await requireUser(request, auth);
		return service.listTickets(context.user.id);
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
