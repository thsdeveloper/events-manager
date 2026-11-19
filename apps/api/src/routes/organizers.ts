import { hasPermission } from '@events-manager/contracts';
import {
	brDocumentSchema,
	brPhoneSchema,
	httpUrlSchema,
	organizerSignupSchema,
	organizerPaymentSettingsSchema,
} from '@events-manager/contracts';
import { OrganizerPaymentService } from '../application/organizers/organizer-payment-service.js';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MediaService } from '../application/media/media-service.js';
import { OrganizerService } from '../application/organizers/organizer-service.js';
import type { ApiEnv } from '../config/env.js';
import { paymentCapabilities } from '../config/payment-capabilities.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseMediaRepository } from '../infrastructure/supabase/media-repository.js';
import { SupabaseOrganizerRepository } from '../infrastructure/supabase/organizer-repository.js';
import { ApiError } from '../shared/errors.js';
import { ACTIVE_ORGANIZER_COOKIE, requireOrganizer, requireUser } from './auth-context.js';
import { setActiveEventCookie, setActiveOrganizerCookie } from './session-cookies.js';
import { AdminService } from '../application/admin/admin-service.js';
import { SupabaseAdminRepository } from '../infrastructure/supabase/admin-repository.js';

const organizerInput = z.object({
	name: z.string().trim().min(2).optional(),
	email: z.string().email(),
	phone: brPhoneSchema.nullable().optional(),
	description: z.string().nullable().optional(),
	website: httpUrlSchema.or(z.literal('')).nullable().optional(),
	document: brDocumentSchema.nullable().optional(),
	logo: z.string().uuid().optional(),
});

function stringOrNull(value: unknown) {
	return typeof value === 'string' && value.length > 0 ? value : null;
}

export async function organizerRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
	const { env, clients } = options;
	const auth = createSupabaseAuthService(clients);
	const mediaRepository = new SupabaseMediaRepository(clients);
	const service = new OrganizerService(new SupabaseOrganizerRepository(clients), mediaRepository);
	const media = new MediaService(mediaRepository);
	const initialStatus = env.PAYMENTS_MODE === 'mock' ? 'active' : 'pending';
	const admin = new AdminService(new SupabaseAdminRepository(clients));
	const capabilities = paymentCapabilities(env);
	const paymentSettings = new OrganizerPaymentService(
		new SupabaseOrganizerRepository(clients),
		capabilities.methods,
		capabilities.testMode,
	);
	app.get('/api/organizer/payment-settings', async (request) => {
		const context = await requireOrganizer(request, auth);
		return paymentSettings.get(context.organizer.id);
	});
	app.patch('/api/organizer/payment-settings', async (request) => {
		const context = await requireOrganizer(request, auth);
		return paymentSettings.update(context.organizer.id, organizerPaymentSettingsSchema.parse(request.body));
	});

	app.get('/api/organizer/event-selection', async (request) => {
		const context = await requireOrganizer(request, auth);
		const { events } = await admin.eventFilterOptions(context.organizer.id);
		return {
			events: request.iam
				? events.filter((event) => hasPermission(request.iam!.access, 'events.read', event.id))
				: events,
			selectedEventId: context.eventId,
		};
	});

	app.post('/api/organizer/event-selection', async (request, reply) => {
		const context = await requireOrganizer(request, auth);
		const { eventId } = z.object({ eventId: z.string().uuid().nullable() }).parse(request.body);
		if (eventId) {
			await auth.assertOrganizerOwnsEvent(context.organizer.id, eventId);
			if (request.iam && !hasPermission(request.iam.access, 'events.read', eventId))
				throw new ApiError('Você não tem acesso a este evento.', 403, 'PERMISSION_DENIED');
		}
		setActiveEventCookie(reply, env, context.organizer.id, eventId);
		return { selectedEventId: eventId };
	});

	app.get('/api/organizer/profile', async (request) => {
		// requireOrganizer resolves the active organization from the cookie and
		// verifies ownership, so the profile always belongs to the caller.
		const context = await requireOrganizer(request, auth);
		return { organizer: await service.getProfile(context.organizer.id) };
	});

	app.post('/api/organizer/request', async (request, reply) => {
		const context = await requireUser(request, auth);
		const profile = await auth.requireCompleteProfile(context.user);
		const input = organizerSignupSchema.parse(request.body);
		// Pessoa física: nome, e-mail, telefone e CPF vêm do perfil validado, nunca do corpo do pedido.
		const organizer = await service.create(context.user.id, input, initialStatus, {
			profile: {
				document: stringOrNull(profile.document),
				email: stringOrNull(profile.email) ?? context.user.email ?? null,
				first_name: stringOrNull(profile.first_name),
				last_name: stringOrNull(profile.last_name),
				phone: stringOrNull(profile.phone),
			},
		});
		if (organizer.status === 'active') setActiveOrganizerCookie(reply, env, organizer.id);
		return reply.code(201).send({ success: true, organizer });
	});

	app.patch('/api/organizer/profile', async (request) => {
		const context = await requireOrganizer(request, auth);
		const organizer = await service.update(context.organizer.id, organizerInput.partial().parse(request.body));
		return { success: true, organizer };
	});

	app.post('/api/organizer/logo', async (request) => {
		const context = await requireOrganizer(request, auth);
		const file = await request.file();
		if (!file) throw new ApiError('Nenhum arquivo foi enviado.', 400, 'FILE_REQUIRED');
		if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
			throw new ApiError('Envie uma imagem PNG, JPG ou WebP.', 422, 'INVALID_FILE_TYPE');
		}
		const buffer = await file.toBuffer();
		if (buffer.length > 5 * 1024 * 1024) throw new ApiError('O limite é 5 MB.', 413, 'FILE_TOO_LARGE');
		const uploaded = await media.upload({
			buffer,
			filename: file.filename,
			folder: 'organizers',
			mimetype: file.mimetype,
			userId: context.user.id,
		});
		const result = await service.setLogo(context.organizer.id, uploaded.file.id, context.user.id);
		if (result.cleanupPending)
			request.log.warn({ organizerId: context.organizer.id }, 'Previous organizer logo cleanup failed');
		return { success: true, file: uploaded, ...result };
	});

	app.delete('/api/organizer/logo', async (request) => {
		const context = await requireOrganizer(request, auth);
		const result = await service.setLogo(context.organizer.id, null, context.user.id);
		if (result.cleanupPending) request.log.warn({ organizerId: context.organizer.id }, 'Organizer logo cleanup failed');
		return { success: true, ...result };
	});

	app.get('/api/organizer/organizations', async (request) => {
		const context = await requireUser(request, auth);
		const organizations = await auth.listOrganizers(context.user.id);
		const active = organizations.find((item) => item.id === request.cookies?.[ACTIVE_ORGANIZER_COOKIE]);

		return { data: organizations, activeId: active?.id ?? organizations[0]?.id ?? null };
	});

	app.post('/api/organizer/organizations', async (request, reply) => {
		const context = await requireUser(request, auth);
		await auth.requireCompleteProfile(context.user);
		const input = z
			.object({ name: z.string().trim().min(2, 'Informe o nome da organização').max(120), email: z.string().email() })
			.parse(request.body);
		const organizer = await auth.createOrganizer(context.user.id, input);
		setActiveOrganizerCookie(reply, env, organizer.id);

		return reply.code(201).send({ success: true, organizer });
	});

	app.post('/api/organizer/organizations/:id/activate', async (request, reply) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const organizer = await auth.activateOrganizer(context.user.id, id);
		setActiveOrganizerCookie(reply, env, organizer.id);

		return { success: true, organizer };
	});

	app.get('/api/organizer/stats', async (request) => {
		const context = await requireOrganizer(request, auth);
		return { success: true, stats: await service.stats(context.organizer.id, context.eventId ?? undefined) };
	});

	app.patch('/api/organizer/payout-settings', async (request) => {
		await requireOrganizer(request, auth);
		throw new ApiError('Cadastre os dados e documentos na página de recebimento.', 410, 'RECEIVING_FLOW_REQUIRED');
	});
}
