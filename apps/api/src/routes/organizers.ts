import { httpUrlSchema } from '@events-manager/contracts';
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
import { requireOrganizer, requireUser } from './auth-context.js';

const organizerInput = z.object({
	name: z.string().trim().min(2).optional(),
	email: z.string().email(),
	phone: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	website: httpUrlSchema.or(z.literal('')).nullable().optional(),
	document: z.string().nullable().optional(),
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
		const context = await requireUser(request, auth);
		return { organizer: await service.getProfile(context.user.id) };
	});

	app.post('/api/organizer/request', async (request, reply) => {
		const context = await requireUser(request, auth);
		const input = organizerInput
			.extend({ name: z.string().trim().min(2), description: z.string().trim().min(10) })
			.parse(request.body);
		const organizer = await service.create(context.user.id, input, initialStatus);
		return reply.code(201).send({ success: true, organizer });
	});

	app.post('/api/organizer/profile', async (request, reply) => {
		const context = await requireUser(request, auth);
		const input = organizerInput.extend({ name: z.string().trim().min(2) }).parse(request.body);
		const organizer = await service.create(context.user.id, input, initialStatus);
		return reply.code(201).send({ success: true, organizer });
	});

	app.patch('/api/organizer/profile', async (request) => {
		const context = await requireUser(request, auth);
		const organizer = await service.update(context.user.id, organizerInput.partial().parse(request.body));
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
