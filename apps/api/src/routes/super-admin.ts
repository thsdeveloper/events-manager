import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import { SuperAdminService } from '../application/super-admin/super-admin-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseSuperAdminRepository } from '../infrastructure/supabase/super-admin-repository.js';
import { requireSuperAdmin } from './auth-context.js';

const paymentSettingsSchema = z.object({
	platform_fee_percentage: z.coerce.number().min(0).max(100),
	pix_fee_fixed: z.coerce.number().min(0),
	card_fee_percentage: z.coerce.number().min(0).max(100),
	card_fee_fixed: z.coerce.number().min(0),
	card_installment_2_6_percentage: z.coerce.number().min(0).max(100),
	card_installment_7_12_percentage: z.coerce.number().min(0).max(100),
	boleto_fee_fixed: z.coerce.number().min(0),
	payout_fee_fixed: z.coerce.number().min(0),
	minimum_payout: z.coerce.number().min(1),
	payouts_enabled: z.boolean(),
	convenience_fee_calculation_method: z.enum(['buyer_pays', 'organizer_absorbs']),
});

const organizerQuery = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(20),
	search: z.string().trim().default(''),
	status: z.enum(['active', 'pending', 'archived']).optional(),
});

const transactionQuery = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().min(1).max(100).default(25),
	status: z.enum(['succeeded', 'pending', 'failed', 'refunded']).optional(),
	search: z.string().trim().default(''),
});

function auditContext(request: FastifyRequest) {
	return { ip: request.ip, userAgent: request.headers['user-agent'] ?? null };
}

export async function superAdminRoutes(
	app: FastifyInstance,
	options: { clients: SupabaseClients; payments: PaymentGateway },
) {
	const { clients, payments } = options;
	const auth = createSupabaseAuthService(clients);
	const service = new SuperAdminService(new SupabaseSuperAdminRepository(clients), payments);

	app.get('/api/super-admin/overview', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.overview();
	});

	app.get('/api/super-admin/organizers', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.listOrganizers(organizerQuery.parse(request.query));
	});

	app.patch('/api/super-admin/organizers/:id/status', async (request) => {
		const admin = await requireSuperAdmin(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const input = z
			.object({
				status: z.enum(['active', 'pending', 'archived']).optional(),
				payout_status: z.enum(['not_configured', 'pending_review', 'enabled', 'blocked']).optional(),
			})
			.refine((value) => value.status || value.payout_status, 'Informe um status para atualizar.')
			.parse(request.body);
		return service.updateOrganizerStatus(admin.user.id, id, input, auditContext(request));
	});

	app.get('/api/super-admin/finance/transactions', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.listTransactions(transactionQuery.parse(request.query));
	});

	app.get('/api/super-admin/finance/payouts', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.listPayouts();
	});

	app.post('/api/super-admin/finance/payouts', async (request, reply) => {
		const admin = await requireSuperAdmin(request, auth);
		const input = z
			.object({ organizer_id: z.string().uuid(), amount: z.coerce.number().positive() })
			.parse(request.body);
		return reply
			.code(201)
			.send(await service.createPayout(admin.user.id, input.organizer_id, input.amount, auditContext(request)));
	});

	app.get('/api/super-admin/settings/payments', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.getPaymentSettings();
	});

	app.patch('/api/super-admin/settings/payments', async (request) => {
		const admin = await requireSuperAdmin(request, auth);
		return service.updatePaymentSettings(
			admin.user.id,
			paymentSettingsSchema.parse(request.body),
			auditContext(request),
		);
	});
}
