import { authorizedEventIds } from './iam-authorization.js';
import type { FastifyRequest } from 'fastify';
import { brDocumentSchema, brPhoneSchema } from '@events-manager/contracts';
import { ticketInputSchema, ticketPatchSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AdminService } from '../application/admin/admin-service.js';
import { GetOrganizerDashboard } from '../application/dashboard/get-organizer-dashboard.js';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import { RefundRegistration } from '../application/payments/refund-registration.js';
import { SupabaseAdminRepository } from '../infrastructure/supabase/admin-repository.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseOrganizerDashboardRepository } from '../infrastructure/supabase/organizer-dashboard-repository.js';
import { SupabasePaymentRepository } from '../infrastructure/supabase/payment-repository.js';
import { requireOrganizer } from './auth-context.js';

const ticketQuery = z.object({
	page: z.coerce.number().int().positive().default(1),
	search: z.string().default(''),
	eventIds: z.string().optional(),
	status: z.string().optional(),
});
const participantQuery = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	search: z.string().default(''),
	eventIds: z.string().optional(),
	ticketTypeIds: z.string().optional(),
	registrationStatus: z.string().optional(),
	paymentStatus: z.string().optional(),
	hasCheckedIn: z.enum(['true', 'false']).optional(),
	sortField: z.enum(['date_created', 'participant_name', 'payment_status', 'status']).default('date_created'),
	sortDirection: z.enum(['asc', 'desc']).default('desc'),
});
const participantInput = z.object({
	participant_name: z.string().trim().min(1),
	participant_email: z.string().email(),
	participant_phone: brPhoneSchema.nullable().optional(),
	participant_document: brDocumentSchema.nullable().optional(),
	notes: z.string().nullable().optional(),
});

export async function adminRoutes(
	app: FastifyInstance,
	options: { clients: SupabaseClients; payments?: PaymentGateway },
) {
	const { clients, payments } = options;
	const auth = createSupabaseAuthService(clients);
	const adminFor = (request: FastifyRequest) =>
		new AdminService(
			new SupabaseAdminRepository(clients, authorizedEventIds(request)),
			payments
				? new RefundRegistration(payments, new SupabasePaymentRepository(clients, payments.provider))
				: undefined,
		);
	const dashboardFor = (request: FastifyRequest) =>
		new GetOrganizerDashboard(new SupabaseOrganizerDashboardRepository(clients.admin, authorizedEventIds(request)));

	app.get('/api/admin/dashboard', async (request) => {
		const context = await requireOrganizer(request, auth);
		return dashboardFor(request).execute(context.organizer.id, context.eventId ?? undefined);
	});

	app.get('/api/admin/event-configurations', async (request) => {
		await requireOrganizer(request, auth);
		return adminFor(request).getConfiguration();
	});

	app.get('/api/admin/ingressos/filter-options', async (request) => {
		const context = await requireOrganizer(request, auth);
		return adminFor(request).eventFilterOptions(context.organizer.id, context.eventId ?? undefined);
	});

	app.get('/api/admin/ingressos', async (request) => {
		const context = await requireOrganizer(request, auth);
		return adminFor(request).listTickets(context.organizer.id, {
			...ticketQuery.parse(request.query),
			...(context.eventId ? { eventIds: context.eventId } : {}),
		});
	});

	app.post('/api/admin/ingressos', async (request, reply) => {
		const context = await requireOrganizer(request, auth);
		return reply
			.code(201)
			.send(await adminFor(request).createTicket(context.organizer.id, ticketInputSchema.parse(request.body)));
	});

	app.patch('/api/admin/ingressos/:id', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return adminFor(request).updateTicket(context.organizer.id, id, ticketPatchSchema.parse(request.body));
	});

	app.delete('/api/admin/ingressos/:id', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		await adminFor(request).deleteTicket(context.organizer.id, id);
		return { success: true };
	});

	app.post('/api/admin/ingressos/:id/duplicate', async (request, reply) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return reply.code(201).send(await adminFor(request).duplicateTicket(context.organizer.id, id));
	});

	app.get('/api/admin/participantes/filter-options', async (request) => {
		const context = await requireOrganizer(request, auth);
		return adminFor(request).participantFilterOptions(context.organizer.id, context.eventId ?? undefined);
	});

	app.get('/api/admin/participantes', async (request) => {
		const context = await requireOrganizer(request, auth);
		return adminFor(request).listParticipants(context.organizer.id, {
			...participantQuery.parse(request.query),
			...(context.eventId ? { eventIds: context.eventId } : {}),
		});
	});

	app.get('/api/admin/participantes/export', async (request, reply) => {
		const context = await requireOrganizer(request, auth);
		return reply
			.type('text/csv; charset=utf-8')
			.header('content-disposition', 'attachment; filename="participantes.csv"')
			.send(
				await adminFor(request).exportParticipants(context.organizer.id, {
					...participantQuery.parse(request.query),
					...(context.eventId ? { eventIds: context.eventId } : {}),
				}),
			);
	});

	app.get('/api/admin/participantes/:id', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return adminFor(request).getParticipant(context.organizer.id, id, context.eventId ?? undefined);
	});

	app.patch('/api/admin/participantes/:id/edit', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return adminFor(request).editParticipant(context.organizer.id, id, participantInput.parse(request.body));
	});

	app.post('/api/admin/participantes/:id/checkin', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return adminFor(request).checkIn(context.organizer.id, id);
	});

	app.delete('/api/admin/participantes/:id/checkin', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return adminFor(request).undoCheckIn(context.organizer.id, id);
	});

	app.post('/api/admin/participantes/:id/cancel', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const { reason, refund } = z
			.object({ reason: z.string().trim().min(3), refund: z.boolean().optional() })
			.parse(request.body);
		return adminFor(request).cancelParticipant(context.organizer.id, id, reason, { refund });
	});
}
