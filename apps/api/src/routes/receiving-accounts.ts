import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
	receivingAccountSubmissionSchema,
	receivingAccountReviewSchema,
	receivingDocumentKindSchema,
	receivingHistoryQuerySchema,
} from '@events-manager/contracts';
import { ReceivingAccountService } from '../application/receiving-accounts/receiving-account-service.js';
import { SupabaseReceivingAccountRepository } from '../infrastructure/supabase/receiving-account-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { requireSuperAdmin, requireUser } from './auth-context.js';
import { ApiError } from '../shared/errors.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
const params = z.object({ id: z.string().uuid() });
const privateResponse = (reply: FastifyReply) =>
	reply.header('Cache-Control', 'private, no-store').header('Pragma', 'no-cache');
export async function receivingAccountRoutes(app: FastifyInstance, { clients }: { clients: SupabaseClients }) {
	const auth = createSupabaseAuthService(clients),
		service = new ReceivingAccountService(new SupabaseReceivingAccountRepository(clients));
	const limiter = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));
	const ownerPath = '/api/organizer/receiving-accounts/:id',
		adminPath = '/api/super-admin/organizers/:id/receiving-account';
	for (const [base, admin] of [
		[ownerPath, false],
		[adminPath, true],
	] as const) {
		app.get(base, async (request, reply) => {
			const context = admin ? await requireSuperAdmin(request, auth) : await requireUser(request, auth);
			const { id } = params.parse(request.params);
			const { page, limit } = receivingHistoryQuerySchema.parse(request.query);
			if (!admin) await service.owner(id, context.user.id);
			privateResponse(reply);
			return service.overview(id, page, limit);
		});
		app.get(`${base}/documents/:documentId`, async (request, reply) => {
			const context = admin ? await requireSuperAdmin(request, auth) : await requireUser(request, auth);
			const { id, documentId } = params.extend({ documentId: z.string().uuid() }).parse(request.params);
			if (!admin) await service.owner(id, context.user.id);
			const { document, buffer } = await service.download(id, documentId);
			return privateResponse(reply)
				.header('X-Content-Type-Options', 'nosniff')
				.header('Content-Security-Policy', "default-src 'none'; sandbox")
				.type(document.mime_type)
				.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`)
				.send(buffer);
		});
	}
	app.post(`${ownerPath}/documents`, async (request, reply) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		await service.owner(id, context.user.id);
		const { kind } = z.object({ kind: receivingDocumentKindSchema }).parse(request.query);
		try {
			await limiter.execute({
				scope: 'receiving-document-upload',
				subject: context.user.id,
				limit: 30,
				windowSeconds: 3600,
			});
		} catch (error) {
			if (error instanceof RateLimitExceeded)
				throw new ApiError('Limite de envios atingido. Tente novamente mais tarde.', 429, 'RATE_LIMITED');
			throw error;
		}
		const file = await request.file({ limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
		if (!file) throw new ApiError('Selecione um documento.', 422, 'FILE_REQUIRED');
		const document = await service.upload(id, context.user.id, kind, {
			filename: file.filename,
			mimetype: file.mimetype,
			buffer: await file.toBuffer(),
		});
		return privateResponse(reply).code(201).send({ document });
	});
	app.post(ownerPath, async (request, reply) => {
		const context = await requireUser(request, auth);
		const { id } = params.parse(request.params);
		const organizer = await service.owner(id, context.user.id);
		const input = receivingAccountSubmissionSchema.parse(request.body);
		return privateResponse(reply)
			.code(201)
			.send(await service.submit(organizer, context.user.id, input));
	});
	app.post(`${adminPath}/:requestId/review`, async (request, reply) => {
		const context = await requireSuperAdmin(request, auth);
		const { id, requestId } = params.extend({ requestId: z.string().uuid() }).parse(request.params);
		privateResponse(reply);
		return service.review(id, requestId, context.user.id, receivingAccountReviewSchema.parse(request.body));
	});
}
