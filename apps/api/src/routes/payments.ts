import { checkoutAttendeeSchema, checkoutQuoteSchema, transparentCheckoutSchema } from '@events-manager/contracts';
import { checkoutBuyerFromProfile } from '../application/payments/checkout-buyer.js';
import { TransparentCheckoutService } from '../application/payments/transparent-checkout-service.js';
import { SupabaseTransparentAttemptRepository } from '../infrastructure/supabase/transparent-attempt-repository.js';
import { brDocumentSchema, brPhoneSchema, httpUrlSchema } from '@events-manager/contracts';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { CouponService } from '../application/coupons/coupon-service.js';
import { GetCheckoutStatus } from '../application/payments/get-checkout-status.js';
import { ManageTicketInventory } from '../application/payments/manage-ticket-inventory.js';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import { PaymentService, type PaymentWebhookPayload } from '../application/payments/payment-service.js';
import { ReconcileCheckouts } from '../application/payments/reconcile-checkouts.js';
import { ReconcileInstallmentCharges } from '../application/payments/reconcile-installment-charges.js';
import { EnforceRateLimit } from '../application/security/rate-limit.js';
import { DeliverTickets } from '../application/tickets/deliver-tickets.js';
import type { ApiEnv } from '../config/env.js';
import { createEmailService } from '../infrastructure/email/create-email-service.js';
import { verifyAbacatePayWebhook, verifyWebhookSecret } from '../infrastructure/payments/abacatepay-gateway.js';
import { createSupabaseAuthService } from '../infrastructure/supabase/auth-repository.js';
import { SupabaseCheckoutReconciliationRepository } from '../infrastructure/supabase/checkout-reconciliation-repository.js';
import { SupabaseCouponRepository } from '../infrastructure/supabase/coupon-repository.js';
import { SupabaseCheckoutStatusRepository } from '../infrastructure/supabase/checkout-status-repository.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { SupabaseInstallmentReconciliationRepository } from '../infrastructure/supabase/installment-reconciliation-repository.js';
import { SupabasePaymentRepository } from '../infrastructure/supabase/payment-repository.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { SupabaseTicketDeliveryRepository } from '../infrastructure/supabase/ticket-delivery-repository.js';
import { SupabaseTicketInventoryRepository } from '../infrastructure/supabase/ticket-inventory-repository.js';
import { ApiError } from '../shared/errors.js';
import { requireUser } from './auth-context.js';

const installmentCheckoutSchema = z
	.object({
		ticket_id: z.string().uuid(),
		quantity: z.number().int().positive(),
		installments: z.number().int().min(2).max(12),
		participant_name: z.string().trim().min(1),
		participant_email: z.string().email(),
		participant_phone: brPhoneSchema.optional(),
		participant_document: brDocumentSchema.optional(),
		attendees: z.array(checkoutAttendeeSchema.nullable()).max(100).optional(),
	})
	.refine((input) => !input.attendees || input.attendees.length === input.quantity, {
		message: 'Informe um participante por ingresso.',
		path: ['attendees'],
	});

const providerAmountSchema = z.union([
	z.number().finite().nonnegative(),
	z.string().regex(/^\d+(?:\.\d+)?$/, 'Valor monetário inválido'),
]);
const providerMovementSchema = z
	.object({
		amount: providerAmountSchema.optional(),
		platformFee: providerAmountSchema.optional(),
		id: z.string(),
		externalId: z
			.string()
			.nullish()
			.transform((value) => value ?? undefined)
			.optional(),
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
				amount: providerAmountSchema.optional(),
				platformFee: providerAmountSchema.optional(),
				id: z.string().optional(),
				externalId: z
					.string()
					.nullish()
					.transform((value) => value ?? undefined)
					.optional(),
				receiptUrl: httpUrlSchema.nullable().optional(),
				reason: z.string().optional(),
				checkout: z
					.object({
						id: z.string(),
						externalId: z
							.string()
							.nullish()
							.transform((value) => value ?? undefined)
							.optional(),
						amount: providerAmountSchema.optional(),
						paidAmount: providerAmountSchema.nullable().optional(),
						platformFee: providerAmountSchema.optional(),
						methods: z.array(z.string()).optional(),
					})
					.passthrough()
					.optional(),
				transparent: z
					.object({
						id: z.string(),
						externalId: z
							.string()
							.nullish()
							.transform((value) => value ?? undefined)
							.optional(),
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
	const checkoutReconciliation = new SupabaseCheckoutReconciliationRepository(clients.admin);
	const ticketDelivery = new DeliverTickets(
		new SupabaseTicketDeliveryRepository(clients.admin),
		createEmailService(env, clients).email,
		app.log,
	);
	const payment = new PaymentService(
		new SupabasePaymentRepository(clients, payments.provider),
		payments,
		inventory,
		new GetCheckoutStatus(
			new SupabaseCheckoutStatusRepository(clients.admin),
			{ gateway: payments, reconciliation: checkoutReconciliation },
			ticketDelivery,
		),
		new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin)),
		env.WEB_URL,
		undefined,
		new CouponService(new SupabaseCouponRepository(clients)),
		env.ABACATEPAY_METHODS,
		ticketDelivery,
	);
	const attempts = new TransparentCheckoutService(
		new SupabaseTransparentAttemptRepository(clients.admin),
		payment,
		payments,
		payments.provider === 'mock' || Boolean(env.ABACATEPAY_API_KEY?.startsWith('abc_dev_')),
		ticketDelivery,
	);
	const requestLimit = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));
	async function guard(scope: string, userId: string, ip: string, limit: number) {
		try {
			await Promise.all([
				requestLimit.execute({ scope, subject: userId, limit, windowSeconds: 60 }),
				requestLimit.execute({ scope: `${scope}:ip`, subject: ip, limit: limit * 3, windowSeconds: 60 }),
			]);
		} catch {
			throw new ApiError('Muitas tentativas. Aguarde um minuto e tente novamente.', 429, 'RATE_LIMIT_EXCEEDED');
		}
	}
	const effectiveMethods = (methods: string[]) =>
		payments.provider === 'mock' || env.ABACATEPAY_PUBLIC_KEY ? methods : methods.filter((method) => method !== 'CARD');
	const reconcileCheckouts = new ReconcileCheckouts(payments, checkoutReconciliation, ticketDelivery);
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
			const [, checkouts, installments] = await Promise.all([
				attempts.reconcilePending(),
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

	// Público: o front decide se oferece cartão antes de a pessoa preencher tudo.
	// O modo simulado representa uma loja com tudo habilitado.
	app.get('/api/payments/methods', async (request) => {
		const { eventId } = z.object({ eventId: z.string().uuid().optional() }).parse(request.query);
		return {
			methods: eventId
				? effectiveMethods(await payment.availableMethods(eventId))
				: payments.provider === 'mock'
					? ['PIX', 'CARD']
					: env.ABACATEPAY_METHODS,
		};
	});

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

	app.post('/api/payments/checkout', { bodyLimit: 65536 }, async (request) => {
		const context = await requireUser(request, auth);
		await guard('transparent-checkout', context.user.id, request.ip, 8);
		const input = transparentCheckoutSchema.parse(request.body);
		input.participantInfo = checkoutBuyerFromProfile(await auth.serialize(context.user), input.participantInfo);
		transparentCheckoutSchema.parse(input);
		if (input.paymentMethod === 'CARD' && payments.provider !== 'mock' && !env.ABACATEPAY_PUBLIC_KEY)
			throw new ApiError(
				'Cartão temporariamente indisponível. Escolha outra forma de pagamento.',
				422,
				'PAYMENT_METHOD_UNAVAILABLE',
			);
		return attempts.create(context.user.id, input, request.log);
	});

	app.post('/api/payments/checkout/quote', { bodyLimit: 65536 }, async (request) => {
		const context = await requireUser(request, auth);
		await guard('checkout-quote', context.user.id, request.ip, 60);
		const input = checkoutQuoteSchema.parse(request.body);
		input.participantInfo = checkoutBuyerFromProfile(await auth.serialize(context.user), input.participantInfo);
		const quote = await payment.quote(input);
		return {
			...quote,
			methods: effectiveMethods(quote.methods),
			publicKey: env.ABACATEPAY_PUBLIC_KEY ?? null,
			mock: payments.provider === 'mock',
		};
	});
	app.get('/api/payments/attempts/:id', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		await guard('checkout-status', context.user.id, request.ip, 60);
		return attempts.status(context.user.id, id);
	});

	app.post('/api/checkout/installments', async (request) => {
		const context = await requireUser(request, auth);
		const input = installmentCheckoutSchema.parse(request.body);
		const buyer = checkoutBuyerFromProfile(await auth.serialize(context.user), {
			name: input.participant_name,
			email: input.participant_email,
			phone: input.participant_phone,
			document: input.participant_document,
		});
		return payment.createInstallmentCheckout(
			context.user.id,
			{
				...input,
				participant_name: buyer.name,
				participant_email: buyer.email,
				participant_phone: buyer.phone,
				participant_document: buyer.document,
			},
			request.log,
		);
	});

	app.post('/api/installments/:id/generate-pix', async (request) => {
		const context = await requireUser(request, auth);
		const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
		return payment.generateInstallmentPix(context.user.id, id);
	});

	app.post('/api/payments/webhooks/abacatepay', { config: { rawBody: true }, bodyLimit: 262144 }, async (request) => {
		if (payments.provider === 'mock') return { received: true, mode: 'mock' };
		const { webhookSecret } = z.object({ webhookSecret: z.string().optional() }).parse(request.query ?? {});
		const providedSecret =
			webhookSecret ??
			(typeof request.headers['x-webhook-secret'] === 'string' ? request.headers['x-webhook-secret'] : undefined);
		if (
			!env.ABACATEPAY_WEBHOOK_SECRET ||
			!providedSecret ||
			!verifyWebhookSecret(providedSecret, env.ABACATEPAY_WEBHOOK_SECRET)
		) {
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
		const parsed = webhookPayloadSchema.parse(decoded) as PaymentWebhookPayload;
		const expectedDevMode = Boolean(env.ABACATEPAY_API_KEY?.startsWith('abc_dev_'));
		const modes = [parsed.devMode, parsed.data?.transparent?.devMode, parsed.data?.checkout?.devMode];
		if (modes.some((mode) => mode !== undefined && mode !== expectedDevMode))
			throw new ApiError('Ambiente de pagamento incompatível.', 409, 'PAYMENT_ENVIRONMENT_MISMATCH');
		const handled = await attempts.webhook(parsed);
		return handled ?? payment.processWebhook(parsed);
	});
}
