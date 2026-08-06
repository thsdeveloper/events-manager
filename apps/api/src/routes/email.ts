import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EmailService } from '../application/email/email-service.js';
import type { ApiEnv } from '../config/env.js';
import { NodemailerGateway } from '../infrastructure/email/nodemailer-gateway.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseEmailDeliveryRepository } from '../infrastructure/supabase/email-delivery-repository.js';
import { requireOrganizer } from './auth-context.js';

export async function emailRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
	const { env, clients } = options;
	const auth = createSupabaseAuthService(clients);
	const email = new EmailService(
		new SupabaseEmailDeliveryRepository(clients),
		new NodemailerGateway({
			host: env.SMTP_HOST,
			port: env.SMTP_PORT,
			secure: env.SMTP_SECURE,
			user: env.SMTP_USER,
			password: env.SMTP_PASSWORD,
		}),
		env.EMAIL_FROM,
	);

	app.post('/api/admin/participantes/:id/resend-email', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const registration = await auth.getOwnedRegistration(context.organizer.id, id);
		const delivery = await email.sendRegistrationConfirmation(
			registration as Parameters<typeof email.sendRegistrationConfirmation>[0],
			request.headers['idempotency-key']?.toString() ?? `manual-confirmation-${id}-${request.id}`,
		);
		return { success: true, deliveryId: delivery.id };
	});
}
