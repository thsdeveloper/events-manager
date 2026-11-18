import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';
import { receivingHistoryQuerySchema } from '@events-manager/contracts';
import { ManualPayoutService } from '../application/payouts/manual-payout-service.js';
import { SupabaseManualPayoutRepository } from '../infrastructure/supabase/manual-payout-repository.js';
import { ReceivingAccountService } from '../application/receiving-accounts/receiving-account-service.js';
import { SupabaseReceivingAccountRepository } from '../infrastructure/supabase/receiving-account-repository.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { requireSuperAdmin, requireUser } from './auth-context.js';
import { ApiError } from '../shared/errors.js';
const idSchema = z.object({ id: z.string().uuid() });
const privateResponse = (reply: FastifyReply) => reply.header('Cache-Control', 'private, no-store');
export async function manualPayoutRoutes(app: FastifyInstance, { clients }: { clients: SupabaseClients }) {
	const auth = createSupabaseAuthService(clients),
		service = new ManualPayoutService(new SupabaseManualPayoutRepository(clients)),
		ownerService = new ReceivingAccountService(new SupabaseReceivingAccountRepository(clients));
	app.get('/api/super-admin/organizers/:id/manual-payouts', async (request, reply) => {
		await requireSuperAdmin(request, auth);
		const { id } = idSchema.parse(request.params);
		const { page, limit } = receivingHistoryQuerySchema.parse(request.query);
		privateResponse(reply);
		return service.list(id, page, limit);
	});
	app.post('/api/super-admin/finance/payouts/:id/receipt', async (request, reply) => {
		const context = await requireSuperAdmin(request, auth);
		const { id } = idSchema.parse(request.params);
		const file = await request.file({ limits: { fileSize: 10 * 1024 * 1024, files: 1 } });
		if (!file) throw new ApiError('Anexe o comprovante da transferência.', 422, 'RECEIPT_REQUIRED');
		return privateResponse(reply)
			.code(201)
			.send(
				await service.upload(id, context.user.id, {
					filename: file.filename,
					mimetype: file.mimetype,
					buffer: await file.toBuffer(),
				}),
			);
	});
	app.post('/api/super-admin/finance/payouts/:id/complete', async (request, reply) => {
		const context = await requireSuperAdmin(request, auth);
		const { id } = idSchema.parse(request.params);
		const input = z
			.object({
				receipt_id: z.string().uuid(),
				reference: z.string().trim().min(3).max(160),
				confirmed_transfer: z.literal(true),
			})
			.strict()
			.parse(request.body);
		privateResponse(reply);
		return service.finish(id, context.user.id, input.receipt_id, input.reference, null);
	});
	app.post('/api/super-admin/finance/payouts/:id/cancel', async (request, reply) => {
		const context = await requireSuperAdmin(request, auth);
		const { id } = idSchema.parse(request.params);
		const input = z
			.object({ reason: z.string().trim().min(5).max(2000), confirmed_not_sent: z.literal(true) })
			.strict()
			.parse(request.body);
		privateResponse(reply);
		return service.finish(id, context.user.id, null, null, input.reason);
	});
	for (const [path, admin] of [
		['/api/super-admin/organizers/:id/manual-payouts/:payoutId/receipt', true],
		['/api/organizer/receiving-accounts/:id/payouts/:payoutId/receipt', false],
	] as const) {
		app.get(path, async (request, reply) => {
			const context = admin ? await requireSuperAdmin(request, auth) : await requireUser(request, auth);
			const { id, payoutId } = idSchema.extend({ payoutId: z.string().uuid() }).parse(request.params);
			if (!admin) await ownerService.owner(id, context.user.id);
			const { receipt, buffer } = await service.download(id, payoutId);
			return privateResponse(reply)
				.header('X-Content-Type-Options', 'nosniff')
				.header('Content-Security-Policy', "default-src 'none'; sandbox")
				.type(receipt.mime_type)
				.header('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(receipt.filename)}`)
				.send(buffer);
		});
	}
}
