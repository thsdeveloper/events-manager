import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getOwnedRegistration, requireOrganizer } from '../application/auth/organizer-context.js';
import { EmailService } from '../application/email/email-service.js';
import type { ApiEnv } from '../config/env.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';

export async function emailRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
  const { env, clients } = options;
  const email = new EmailService(env, clients);

  app.post('/api/admin/participantes/:id/resend-email', async (request) => {
    const context = await requireOrganizer(request, clients);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const registration = await getOwnedRegistration(clients, context.organizer.id, id);
    const delivery = await email.sendRegistrationConfirmation(registration, request.headers['idempotency-key']?.toString() ?? `manual-confirmation-${id}-${request.id}`);
    return { success: true, deliveryId: delivery.id };
  });
}
