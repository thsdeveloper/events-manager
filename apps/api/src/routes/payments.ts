import { brDocumentSchema, brPhoneSchema } from '@events-manager/contracts';
import { httpUrlSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { GetCheckoutStatus } from '../application/payments/get-checkout-status.js';
import { ManageTicketInventory } from '../application/payments/manage-ticket-inventory.js';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import { PaymentService, type PaymentWebhookPayload } from '../application/payments/payment-service.js';
import { ReconcileCheckouts } from '../application/payments/reconcile-checkouts.js';
import { ReconcileInstallmentCharges } from '../application/payments/reconcile-installment-charges.js';
import { EnforceRateLimit } from '../application/security/rate-limit.js';
import type { ApiEnv } from '../config/env.js';
import { verifyAbacatePayWebhook } from '../infrastructure/payments/abacatepay-gateway.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseCheckoutReconciliationRepository } from '../infrastructure/supabase/checkout-reconciliation-repository.js';
import { SupabaseCheckoutStatusRepository } from '../infrastructure/supabase/checkout-status-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseInstallmentReconciliationRepository } from '../infrastructure/supabase/installment-reconciliation-repository.js';
import { SupabasePaymentRepository } from '../infrastructure/supabase/payment-repository.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { SupabaseTicketInventoryRepository } from '../infrastructure/supabase/ticket-inventory-repository.js';
import { ApiError } from '../shared/errors.js';
import { requireUser } from './auth-context.js';

const checkoutSchema = z.object({
	eventId: z.string().uuid(),
	tickets: z.array(z.object({ ticketId: z.string().uuid(), quantity: z.number().int().positive() })).min(1),
	participantInfo: z.object({
		name: z.string().trim().min(1),
		email: z.string().email(),
		phone: brPhoneSchema.optional(),
		document: brDocumentSchema.optional(),
	}),
});

const installmentCheckoutSchema = z.object({
	ticket_id: z.string().uuid(),
	quantity: z.number().int().positive(),
	installments: z.number().int().min(2).max(12),
	participant_name: z.string().trim().min(1),
	participant_email: z.string().email(),
	participant_phone: brPhoneSchema.optional(),
	participant_document: brDocumentSchema.optional(),
});

const providerAmountSchema = z.union([
	z.number().finite().nonnegative(),
	z.string().regex(/^\d+(?:\.\d+)?$/, 'Valor monetário inválido'),
]);
const providerMovementSchema = z
	.object({
		id: z.string(),
		externalId: z.string().optional(),
		receiptUrl: httpUrlSchema.nullable().optional(),
		reason: z.string().optional(),
	})
	.passthrough();
const webhookPayloadSchema = z
	.object({
		id: z.string().optional(),
		event: z.string().min(1),
		data: z
			.object({
				id: z.string().optional(),
				externalId: z.string().optional(),
				receiptUrl: httpUrlSchema.nullable().optional(),
				reason: z.string().optional(),
				checkout: z
					.object({
						id: z.string(),
						externalId: z.string().optional(),
						platformFee: providerAmountSchema.optional(),
						methods: z.array(z.string()).optional(),
					})
					.passthrough()
					.optional(),
				transparent: z
					.object({
						id: z.string(),
						externalId: z.string().optional(),
						platformFee: providerAmountSchema.optional(),
					})
					.passthrough()
					.optional(),
				payerInformation: z.object({ method: z.string().optional() }).passthrough().optional(),
				payout: providerMovementSchema.optional(),
				transfer: providerMovementSchema.optional(),
			})
			.passthrough()
			.default({}),
	})
	.passthrough();

export async function paymentRoutes(
	app: FastifyInstance,
	options: { env: ApiEnv; clients: SupabaseClients; payments: PaymentGateway },
) {
	const { env, clients, payments } = options;
	const auth = createSupabaseAuthService(clients);
	const inventory = new ManageTicketInventory(new SupabaseTicketInventoryRepository(clients.admin));
	const payment = new PaymentService(
		new SupabasePaymentRepository(clients),
		payments,
		inventory,
		new GetCheckoutStatus(new SupabaseCheckoutStatusRepository(clients.admin)),
		new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin)),
		env.WEB_URL,
	);
	const reconcileCheckouts = new ReconcileCheckouts(
		payments,
		new SupabaseCheckoutReconciliationRepository(clients.admin),
	);
	const reconcileInstallments = new ReconcileInstallmentCharges(
		payments,
		new SupabaseInstallmentReconciliationRepository(clients.admin),
	);
	let reconciliationTimer: ReturnType<typeof setInterval> | undefined;
	let reconciliationRunning = false;

	async function runReconciliation() {
		if (reconciliationRunning) return;
		reconciliationRunning = true;
		try {
			const before = new Date(Date.now() - env.PAYMENT_RECONCILIATION_MIN_AGE_MINUTES * 60_000);
			const [checkouts, installments] = await Promise.all([
				reconcileCheckouts.execute({ before, batchSize: env.PAYMENT_RECONCILIATION_BATCH_SIZE }),
				reconcileInstallments.execute({ before, batchSize: env.PAYMENT_RECONCILIATION_BATCH_SIZE }),
			]);
			if (checkouts.claimed > 0 || installments.claimed > 0) {
				app.log.info({ reconciliation: { checkouts, installments } }, 'Payment reconciliation completed');
			}
		} catch (error) {
			app.log.error({ err: error }, 'Checkout reconciliation failed');
		} finally {
			reconciliationRunning = false;
		}
	}

	if (payments.provider === 'abacatepay') {
		app.addHook('onReady', async () => {
			reconciliationTimer = setInterval(
				() => void runReconciliation(),
				env.PAYMENT_RECONCILIATION_INTERVAL_SECONDS * 1_000,
			);
			reconciliationTimer.unref();
		});
		app.addHook('onClose', async () => {
			if (reconciliationTimer) clearInterval(reconciliationTimer);
		});
	}

	app.get('/api/payments/checkout/status', async (request) => {
		const context = await requireUser(request, auth);
		const query = z
			.object({ checkout_id: z.string().uuid().optional(), registration_id: z.string().uuid().optional() })
			.refine((value) => Boolean(value.checkout_id) !== Boolean(value.registration_id), {
				message: 'Informe checkout_id ou registration_id.',
			})
			.parse(request.query);
		return payment.getStatus(
			context.user.id,
			query.registration_id ? { registrationId: query.registration_id } : { checkoutGroupId: query.checkout_id! },
		);
	});

	app.post('/api/payments/checkout', async (request) => {
		const context = await requireUser(request, auth);
		return payment.checkout(context.user.id, checkoutSchema.parse(request.body), request.log);
	});

	app.post('/api/checkout/installments', async (request) => {
		const context = await requireUser(request, auth);
		return payment.createInstallmentCheckout(
			context.user.id,
			installmentCheckoutSchema.parse(request.body),
			request.log,
		);
	});

	app.post('/api/installments/:id/generate-pix', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return payment.generateInstallmentPix(context.user.id, id);
	});

	app.post('/api/payments/webhooks/abacatepay', { config: { rawBody: true } }, async (request) => {
		if (payments.provider === 'mock') return { received: true, mode: 'mock' };
		const { webhookSecret } = z.object({ webhookSecret: z.string().optional() }).parse(request.query ?? {});
		if (!env.ABACATEPAY_WEBHOOK_SECRET || webhookSecret !== env.ABACATEPAY_WEBHOOK_SECRET) {
			throw new ApiError('Secret do webhook inválido.', 401, 'INVALID_WEBHOOK_SECRET');
		}
		const signatureHeader = request.headers['x-webhook-signature'] ?? request.headers['x-abacate-signature'];
		const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
		const rawBody = (request as typeof request & { rawBody?: Buffer }).rawBody;
		if (!signature || !rawBody || !verifyAbacatePayWebhook(rawBody, signature)) {
			throw new ApiError('Assinatura do webhook inválida.', 401, 'INVALID_WEBHOOK_SIGNATURE');
		}
		let decoded: unknown;
		try {
			decoded = JSON.parse(rawBody.toString('utf8'));
		} catch {
			throw new ApiError('Payload do webhook inválido.', 400, 'INVALID_WEBHOOK_PAYLOAD');
		}
		return payment.processWebhook(webhookPayloadSchema.parse(decoded) as PaymentWebhookPayload);
	});
}
