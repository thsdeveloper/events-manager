import type { FastifyInstance } from 'fastify';
import { EmailNotificationPreferences } from '../application/notifications/preferences.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseNotificationPreferences } from '../infrastructure/supabase/notification-preferences-repository.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { requireOrganizer, requireUser } from './auth-context.js';
export async function notificationRoutes(app: FastifyInstance, { clients }: { clients: SupabaseClients }) {
	const auth = createSupabaseAuthService(clients);
	const preferences = new EmailNotificationPreferences(new SupabaseNotificationPreferences(clients));
	app.get('/api/user/notification-preferences', async (request, reply) => {
		const { user } = await requireUser(request, auth);
		reply.header('cache-control', 'private, no-store');
		return preferences.get('user', user.id);
	});
	app.put('/api/user/notification-preferences', async (request, reply) => {
		const { user } = await requireUser(request, auth);
		reply.header('cache-control', 'private, no-store');
		return preferences.save('user', user.id, request.body);
	});
	app.get('/api/organizer/notification-preferences', async (request, reply) => {
		const { organizer } = await requireOrganizer(request, auth);
		reply.header('cache-control', 'private, no-store');
		return preferences.get('organization', organizer.id);
	});
	app.put('/api/organizer/notification-preferences', async (request, reply) => {
		const { organizer } = await requireOrganizer(request, auth);
		reply.header('cache-control', 'private, no-store');
		return preferences.save('organization', organizer.id, request.body);
	});
}
