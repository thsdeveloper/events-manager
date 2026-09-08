import { brDocumentSchema, brPhoneSchema, httpUrlSchema, organizerSignupSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MediaService } from '../application/media/media-service.js';
import { OrganizerService } from '../application/organizers/organizer-service.js';
import type { ApiEnv } from '../config/env.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseMediaRepository } from '../infrastructure/supabase/media-repository.js';
import { SupabaseOrganizerRepository } from '../infrastructure/supabase/organizer-repository.js';
import { ApiError } from '../shared/errors.js';
import { ACTIVE_ORGANIZER_COOKIE, requireOrganizer, requireUser } from './auth-context.js';
import { setActiveOrganizerCookie } from './session-cookies.js';

const organizerInput = z.object({
	name: z.string().trim().min(2).optional(),
	email: z.string().email(),
	phone: brPhoneSchema.nullable().optional(),
	description: z.string().nullable().optional(),
	website: httpUrlSchema.or(z.literal('')).nullable().optional(),
	document: brDocumentSchema.nullable().optional(),
	logo: z.string().uuid().optional(),
});

const payoutInput = z.object({
	payout_pix_key: z.string().trim().min(3),
	payout_pix_key_type: z.enum(['CPF', 'CNPJ', 'PHONE', 'EMAIL', 'RANDOM']),
});

export async function organizerRoutes(app: FastifyInstance, options: { env: ApiEnv; clients: SupabaseClients }) {
	const { env, clients } = options;
	const auth = createSupabaseAuthService(clients);
	const service = new OrganizerService(new SupabaseOrganizerRepository(clients));
	const media = new MediaService(new SupabaseMediaRepository(clients));
	const initialStatus = env.PAYMENTS_MODE === 'mock' ? 'active' : 'pending';

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
		const organizer = await service.create(context.user.id, input, initialStatus, {
			profileDocument: typeof profile.document === 'string' ? profile.document : null,
		});
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
		const uploaded = await media.upload({
			buffer: await file.toBuffer(),
			filename: file.filename,
			folder: 'organizers',
			mimetype: file.mimetype,
			userId: context.user.id,
		});
		const organizer = await service.setLogo(context.organizer.id, uploaded.file.id);
		return { success: true, file: uploaded, organizer };
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
		return { success: true, stats: await service.stats(context.organizer.id) };
	});

	app.patch('/api/organizer/payout-settings', async (request) => {
		const context = await requireOrganizer(request, auth);
		const organizer = await service.updatePayout(context.organizer.id, payoutInput.parse(request.body));
		return {
			success: true,
			organizer,
			message: 'Dados de repasse enviados para validação pela plataforma.',
		};
	});
}
