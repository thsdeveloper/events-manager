import { z } from 'zod';
import { getOwnedRegistration, requireOrganizer } from '../application/auth/organizer-context.js';
import { EmailService } from '../application/email/email-service.js';
export async function emailRoutes(app, options) {
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
//# sourceMappingURL=email.js.map