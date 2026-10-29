import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AdminService } from '../application/admin/admin-service.js';
import { DeliverTickets } from '../application/tickets/deliver-tickets.js';
import type { ApiEnv } from '../config/env.js';
import { createEmailService } from '../infrastructure/email/create-email-service.js';
import { SupabaseAdminRepository } from '../infrastructure/supabase/admin-repository.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseTicketDeliveryRepository } from '../infrastructure/supabase/ticket-delivery-repository.js';
import { requireOrganizer } from './auth-context.js';

export async function emailRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
	const { env, clients } = options;
	const auth = createSupabaseAuthService(clients);
	const { branding, email } = createEmailService(env, clients);
	const admin = new AdminService(
		new SupabaseAdminRepository(clients),
		undefined,
		undefined,
		new DeliverTickets(new SupabaseTicketDeliveryRepository(clients.admin), email, app.log),
	);

	/**
	 * Stable logo URL for e-mails Supabase renders from static templates
	 * (confirmation, recovery). Those templates only interpolate Supabase's own
	 * variables, so they cannot read `site_settings` — pointing them at this
	 * endpoint keeps them in sync with whatever the super admin uploaded.
	 */
	app.get('/api/branding/logo', async (_request, reply) => {
		const { logoUrl } = await branding.load();
		if (!logoUrl) return reply.code(404).send({ detail: 'Nenhuma logo configurada.' });

		// Short cache: e-mail clients proxy images, and the logo changes rarely.
		reply.header('cache-control', 'public, max-age=300');

		return reply.redirect(logoUrl);
	});

	// Reenvia um ingresso nominal: o recibo, se for de quem comprou; senão, o
	// e-mail do participante. Sai com chave nova a cada pedido.
	app.post('/api/admin/participantes/:id/resend-email', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return admin.resendTicket(
			context.organizer.id,
			id,
			request.headers['idempotency-key']?.toString() ?? String(request.id),
		);
	});
}
