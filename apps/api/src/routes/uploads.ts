import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { MediaService } from '../application/media/media-service.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseMediaRepository } from '../infrastructure/supabase/media-repository.js';
import { ApiError } from '../shared/errors.js';
import { requireUser } from './auth-context.js';

export async function uploadRoutes(app: FastifyInstance, options: { clients: SupabaseClients }) {
	const { clients } = options;
	const auth = createSupabaseAuthService(clients);
	const media = new MediaService(new SupabaseMediaRepository(clients));
	const rateLimit = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));

	app.post('/api/upload', async (request, reply) => {
		const context = await requireUser(request, auth);
		try {
			await rateLimit.execute({ scope: 'media-upload-user', subject: context.user.id, limit: 60, windowSeconds: 3600 });
		} catch (error) {
			if (error instanceof RateLimitExceeded)
				throw new ApiError('Limite de uploads atingido. Tente novamente mais tarde.', 429, 'RATE_LIMITED');
			throw error;
		}
		const query = z.object({ folder: z.string().default('uploads') }).parse(request.query);
		const file = await request.file();
		if (!file) throw new ApiError('Nenhum arquivo foi enviado.', 400, 'FILE_REQUIRED');
		const uploaded = await media.upload({
			buffer: await file.toBuffer(),
			filename: file.filename,
			folder: query.folder,
			mimetype: file.mimetype,
			userId: context.user.id,
		});
		return reply.code(201).send({
			fileId: uploaded.file.id,
			filename: uploaded.file.filename,
			url: uploaded.url,
			file: uploaded.file,
		});
	});

	app.get('/api/media/:id', async (request, reply) => {
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return reply.redirect(await media.getPublicUrl(id));
	});
}
