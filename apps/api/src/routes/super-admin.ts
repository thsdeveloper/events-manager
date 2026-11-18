import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { brandingAssetKindSchema, brandingSettingsSchema, categoryIdSchema } from '@events-manager/contracts';
import {
	paymentSettingsSchema,
	organizerAdminQuerySchema,
	organizerAdminUpdateSchema,
	organizerRecordQuerySchema,
	organizerSupportNoteSchema,
} from '@events-manager/contracts';
import { OrganizerSupportService } from '../application/super-admin/organizer-support-service.js';
import { SupabaseOrganizerSupportRepository } from '../infrastructure/supabase/organizer-support-repository.js';
import { BrandingAssetService } from '../application/media/branding-asset-service.js';
import { SupabaseMediaRepository } from '../infrastructure/supabase/media-repository.js';
import { ApiError } from '../shared/errors.js';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import { SuperAdminService } from '../application/super-admin/super-admin-service.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseSuperAdminRepository } from '../infrastructure/supabase/super-admin-repository.js';
import { requireSuperAdmin } from './auth-context.js';

const categorySchema = z.object({
	name: z.string().trim().min(2, 'Informe ao menos 2 caracteres').max(60),
	description: z.string().trim().max(200).nullable().optional(),
	icon: z.string().trim().max(40).nullable().optional(),
	color: z
		.string()
		.trim()
		.regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #rrggbb')
		.nullable()
		.optional(),
	sort: z.coerce.number().int().min(0).nullable().optional(),
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
	const support = new OrganizerSupportService(new SupabaseOrganizerSupportRepository(clients));
	const brandingAssets = new BrandingAssetService(new SupabaseMediaRepository(clients));
	app.post('/api/super-admin/settings/branding/assets', async (request, reply) => {
		const context = await requireSuperAdmin(request, auth);
		const { kind } = z.object({ kind: brandingAssetKindSchema }).parse(request.query);
		const file = await request.file({ limits: { fileSize: 5 * 1024 * 1024 } });
		if (!file) throw new ApiError('Nenhum arquivo foi enviado.', 422, 'FILE_REQUIRED');
		const uploaded = await brandingAssets.upload({
			kind,
			buffer: await file.toBuffer(),
			filename: file.filename,
			mimetype: file.mimetype,
			folder: 'branding',
			userId: context.user.id,
		});
		return reply.code(201).send({ fileId: uploaded.file.id, url: uploaded.url, file: uploaded.file });
	});

	app.get('/api/super-admin/overview', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.overview();
	});

	app.get('/api/super-admin/organizers', async (request) => {
		await requireSuperAdmin(request, auth);
		return support.list(organizerAdminQuerySchema.parse(request.query));
	});

	app.get('/api/super-admin/organizers/:id', async (request) => {
		await requireSuperAdmin(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return support.detail(id);
	});
	app.get('/api/super-admin/organizers/:id/records', async (request) => {
		await requireSuperAdmin(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return support.records(id, organizerRecordQuerySchema.parse(request.query));
	});
	for (const path of ['/api/super-admin/organizers/:id', '/api/super-admin/organizers/:id/status']) {
		app.patch(path, async (request) => {
			const admin = await requireSuperAdmin(request, auth);
			const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
			return support.update(id, admin.user.id, organizerAdminUpdateSchema.parse(request.body), auditContext(request));
		});
	}
	app.post('/api/super-admin/organizers/:id/notes', async (request, reply) => {
		const admin = await requireSuperAdmin(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		const { note } = organizerSupportNoteSchema.parse(request.body);
		return reply.code(201).send(await support.addNote(id, admin.user.id, note, auditContext(request)));
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

	app.get('/api/super-admin/categories', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.listCategories();
	});

	app.post('/api/super-admin/categories', async (request, reply) => {
		const admin = await requireSuperAdmin(request, auth);
		const input = categorySchema.parse(request.body);
		return reply.code(201).send(await service.createCategory(admin.user.id, input, auditContext(request)));
	});

	app.patch('/api/super-admin/categories/:id', async (request) => {
		const admin = await requireSuperAdmin(request, auth);
		const { id } = z.object({ id: categoryIdSchema }).parse(request.params);
		const input = categorySchema.partial().parse(request.body);
		return service.updateCategory(admin.user.id, id, input, auditContext(request));
	});

	app.delete('/api/super-admin/categories/:id', async (request) => {
		const admin = await requireSuperAdmin(request, auth);
		const { id } = z.object({ id: categoryIdSchema }).parse(request.params);
		return service.deleteCategory(admin.user.id, id, auditContext(request));
	});

	app.get('/api/super-admin/settings/branding', async (request) => {
		await requireSuperAdmin(request, auth);
		return service.getBrandingSettings();
	});

	app.patch('/api/super-admin/settings/branding', async (request) => {
		const admin = await requireSuperAdmin(request, auth);
		return service.updateBrandingSettings(
			admin.user.id,
			brandingSettingsSchema.parse(request.body),
			auditContext(request),
		);
	});
}
