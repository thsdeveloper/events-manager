import crypto from 'node:crypto';
import { z } from 'zod';
import { requireUser } from '../application/auth/session.js';
import { buildCheckoutPlan, CheckoutRuleViolation, assertRegistrationOpen, assertTicketAvailable, } from '../application/payments/checkout-plan.js';
import { CheckoutNotFound, GetCheckoutStatus } from '../application/payments/get-checkout-status.js';
import { calculateOrganizerNet } from '../application/payments/fees.js';
import { buildInstallmentAmounts, InstallmentPlanUnavailable } from '../application/payments/installment-plan.js';
import { ManageTicketInventory, TicketInventoryUnavailable } from '../application/payments/manage-ticket-inventory.js';
import { ReconcileCheckouts } from '../application/payments/reconcile-checkouts.js';
import { ReconcileInstallmentCharges } from '../application/payments/reconcile-installment-charges.js';
import { EnforceRateLimit, RateLimitExceeded } from '../application/security/rate-limit.js';
import { verifyAbacatePayWebhook } from '../infrastructure/payments/abacatepay-gateway.js';
import { SupabaseCheckoutStatusRepository } from '../infrastructure/supabase/checkout-status-repository.js';
import { SupabaseCheckoutReconciliationRepository } from '../infrastructure/supabase/checkout-reconciliation-repository.js';
import { SupabaseInstallmentReconciliationRepository } from '../infrastructure/supabase/installment-reconciliation-repository.js';
import { SupabaseRateLimitRepository } from '../infrastructure/supabase/rate-limit-repository.js';
import { SupabaseTicketInventoryRepository } from '../infrastructure/supabase/ticket-inventory-repository.js';
import { ApiError } from '../shared/errors.js';
function ticketCode() {
    return `EVT-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}
const checkoutSchema = z.object({
    eventId: z.string().uuid(),
    tickets: z
        .array(z.object({
        ticketId: z.string().uuid(),
        quantity: z.number().int().positive(),
    }))
        .min(1),
    participantInfo: z.object({
        name: z.string().trim().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        document: z.string().optional(),
    }),
});
const providerAmountSchema = z.union([z.number(), z.string()]);
const providerMovementSchema = z
    .object({
    id: z.string(),
    externalId: z.string().optional(),
    receiptUrl: z.string().url().nullable().optional(),
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
        receiptUrl: z.string().url().nullable().optional(),
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
function money(value) {
    return Math.round(value * 100) / 100;
}
function readPaymentMethod(value) {
    const normalized = String(value ?? '').toLowerCase();
    if (normalized === 'card')
        return 'card';
    if (normalized === 'boleto')
        return 'boleto';
    return 'pix';
}
function checkoutRuleError(error) {
    if (error.rule === 'insufficient_stock') {
        return new ApiError(`Há somente ${error.details.available} ingresso(s) disponível(is).`, 409, 'INSUFFICIENT_STOCK');
    }
    if (error.rule === 'maximum_quantity') {
        return new ApiError('Quantidade acima do limite por compra.', 422, 'PURCHASE_LIMIT');
    }
    if (error.rule === 'minimum_quantity') {
        return new ApiError('Quantidade abaixo do mínimo por compra.', 422, 'MINIMUM_PURCHASE');
    }
    if (error.rule === 'duplicate_ticket') {
        return new ApiError('O mesmo tipo de ingresso foi selecionado mais de uma vez.', 422, 'DUPLICATE_TICKET');
    }
    if (error.rule === 'registration_closed') {
        return new ApiError('As inscrições para este evento estão fechadas.', 422, 'REGISTRATION_CLOSED');
    }
    return new ApiError('Ingresso indisponível.', 422, 'TICKET_UNAVAILABLE');
}
export async function paymentRoutes(app, options) {
    const { env, clients, payments } = options;
    const ticketInventory = new ManageTicketInventory(new SupabaseTicketInventoryRepository(clients.admin));
    const getCheckoutStatus = new GetCheckoutStatus(new SupabaseCheckoutStatusRepository(clients.admin));
    const reconcileCheckouts = new ReconcileCheckouts(payments, new SupabaseCheckoutReconciliationRepository(clients.admin));
    const reconcileInstallmentCharges = new ReconcileInstallmentCharges(payments, new SupabaseInstallmentReconciliationRepository(clients.admin));
    const enforceRateLimit = new EnforceRateLimit(new SupabaseRateLimitRepository(clients.admin));
    let reconciliationTimer;
    let reconciliationRunning = false;
    async function runReconciliation() {
        if (reconciliationRunning)
            return;
        reconciliationRunning = true;
        try {
            const before = new Date(Date.now() - env.PAYMENT_RECONCILIATION_MIN_AGE_MINUTES * 60_000);
            const [checkouts, installmentCharges] = await Promise.all([
                reconcileCheckouts.execute({ before, batchSize: env.PAYMENT_RECONCILIATION_BATCH_SIZE }),
                reconcileInstallmentCharges.execute({ before, batchSize: env.PAYMENT_RECONCILIATION_BATCH_SIZE }),
            ]);
            if (checkouts.claimed > 0 || installmentCharges.claimed > 0) {
                app.log.info({ reconciliation: { checkouts, installmentCharges } }, 'Payment reconciliation completed');
            }
        }
        catch (error) {
            app.log.error({ err: error }, 'Checkout reconciliation failed');
        }
        finally {
            reconciliationRunning = false;
        }
    }
    if (payments.provider === 'abacatepay') {
        app.addHook('onReady', async () => {
            reconciliationTimer = setInterval(() => void runReconciliation(), env.PAYMENT_RECONCILIATION_INTERVAL_SECONDS * 1_000);
            reconciliationTimer.unref();
        });
        app.addHook('onClose', async () => {
            if (reconciliationTimer)
                clearInterval(reconciliationTimer);
        });
    }
    async function reserveInventory(registrationIds) {
        try {
            await ticketInventory.reserve(registrationIds);
        }
        catch (error) {
            if (error instanceof TicketInventoryUnavailable) {
                throw new ApiError('O estoque mudou durante a compra. Revise a quantidade e tente novamente.', 409, 'INSUFFICIENT_STOCK');
            }
            throw error;
        }
    }
    async function releaseInventory(registrationIds) {
        await ticketInventory.release(registrationIds);
    }
    async function limitPaymentOperation(scope, userId, limit) {
        try {
            await enforceRateLimit.execute({ scope, subject: userId, limit, windowSeconds: 60 });
        }
        catch (error) {
            if (error instanceof RateLimitExceeded) {
                throw new ApiError('Muitas tentativas. Aguarde um minuto e tente novamente.', 429, 'RATE_LIMITED');
            }
            throw error;
        }
    }
    app.get('/api/payments/checkout/status', async (request) => {
        const auth = await requireUser(request, clients);
        const query = z
            .object({
            checkout_id: z.string().uuid().optional(),
            registration_id: z.string().uuid().optional(),
        })
            .refine((value) => Boolean(value.checkout_id) !== Boolean(value.registration_id), {
            message: 'Informe checkout_id ou registration_id.',
        })
            .parse(request.query);
        try {
            return await getCheckoutStatus.execute(auth.user.id, query.registration_id ? { registrationId: query.registration_id } : { checkoutGroupId: query.checkout_id });
        }
        catch (error) {
            if (error instanceof CheckoutNotFound) {
                throw new ApiError('Compra não encontrada.', 404, 'CHECKOUT_NOT_FOUND');
            }
            throw error;
        }
    });
    app.post('/api/payments/checkout', async (request) => {
        const auth = await requireUser(request, clients);
        await limitPaymentOperation('checkout', auth.user.id, 8);
        const input = checkoutSchema.parse(request.body);
        const { data: event, error: eventError } = await clients.admin
            .from('events')
            .select('*,organizer_id:organizers(*),tickets:event_tickets(*)')
            .eq('id', input.eventId)
            .eq('status', 'published')
            .maybeSingle();
        if (eventError)
            throw eventError;
        if (!event)
            throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');
        const { data: configuration, error: configurationError } = await clients.admin
            .from('event_configurations')
            .select('*')
            .eq('id', 1)
            .single();
        if (configurationError)
            throw configurationError;
        const checkoutGroupId = crypto.randomUUID();
        const registrations = [];
        const checkoutItems = [];
        const tickets = event.tickets;
        let plan;
        try {
            plan = buildCheckoutPlan({
                configuration,
                registrationWindow: { end: event.registration_end, start: event.registration_start },
                selections: input.tickets,
                tickets: tickets.map((ticket) => ({
                    id: ticket.id,
                    maxQuantityPerPurchase: Number(ticket.max_quantity_per_purchase ?? 10),
                    minQuantityPerPurchase: Number(ticket.min_quantity_per_purchase ?? 1),
                    price: Number(ticket.price),
                    quantity: Number(ticket.quantity),
                    quantitySold: Number(ticket.quantity_sold),
                    saleEndDate: ticket.sale_end_date,
                    saleStartDate: ticket.sale_start_date,
                    serviceFeeType: ticket.service_fee_type,
                    status: ticket.status,
                    visibility: ticket.visibility,
                })),
            });
        }
        catch (error) {
            if (error instanceof CheckoutRuleViolation)
                throw checkoutRuleError(error);
            throw error;
        }
        const allFree = plan.every((item) => item.totalAmount === 0);
        let externalCheckoutCreated = false;
        let inventoryReserved = false;
        try {
            for (const item of plan) {
                const ticket = tickets.find((candidate) => candidate.id === item.ticket.id);
                const { baseAmount, platformFee, serviceFee, totalAmount } = item;
                const { data: registration, error: registrationError } = await clients.admin
                    .from('event_registrations')
                    .insert({
                    event_id: event.id,
                    ticket_type_id: ticket.id,
                    user_id: auth.user.id,
                    participant_name: input.participantInfo.name,
                    participant_email: input.participantInfo.email,
                    participant_phone: input.participantInfo.phone ?? null,
                    participant_document: input.participantInfo.document ?? null,
                    ticket_code: ticketCode(),
                    status: totalAmount === 0 || payments.provider === 'mock' ? 'confirmed' : 'pending',
                    payment_status: totalAmount === 0 ? 'free' : payments.provider === 'mock' ? 'paid' : 'pending',
                    payment_amount: baseAmount,
                    quantity: item.quantity,
                    unit_price: Number(ticket.price),
                    service_fee: serviceFee,
                    platform_fee: platformFee,
                    provider_fee: 0,
                    total_amount: totalAmount,
                    payment_method: totalAmount === 0 ? 'free' : payments.provider === 'mock' ? 'pix' : null,
                    payment_provider: payments.provider,
                    additional_info: { checkout_group_id: checkoutGroupId },
                })
                    .select('*')
                    .single();
                if (registrationError)
                    throw registrationError;
                registrations.push(registration);
                if (totalAmount > 0 && payments.provider !== 'mock') {
                    let productId = ticket.provider_product_id;
                    if (!productId) {
                        const unitPrice = money(totalAmount / item.quantity);
                        const product = await payments.createProduct({
                            externalId: `${ticket.id}:${Math.round(unitPrice * 100)}`,
                            name: ticket.title,
                            description: `${event.title} · ingresso`,
                            priceInCents: Math.round(unitPrice * 100),
                        });
                        productId = product.id;
                        const { error } = await clients.admin
                            .from('event_tickets')
                            .update({ provider_product_id: productId })
                            .eq('id', ticket.id);
                        if (error)
                            throw error;
                    }
                    checkoutItems.push({ productId, quantity: item.quantity });
                }
            }
            const registrationIds = registrations.map((registration) => registration.id);
            await reserveInventory(registrationIds);
            inventoryReserved = true;
            if (allFree || payments.provider === 'mock') {
                for (const registration of registrations) {
                    if (registration.payment_status === 'paid') {
                        const platformFee = Number(registration.platform_fee ?? 0);
                        const baseAmount = Number(registration.payment_amount ?? 0);
                        const { error: transactionError } = await clients.admin.from('payment_transactions').insert({
                            registration_id: registration.id,
                            provider: 'mock',
                            provider_event_id: `mock:${checkoutGroupId}:${registration.id}`,
                            provider_object_id: checkoutGroupId,
                            event_type: 'checkout.completed',
                            amount: Number(registration.total_amount),
                            provider_fee: 0,
                            platform_fee: platformFee,
                            organizer_net: calculateOrganizerNet(baseAmount, Number(registration.total_amount), platformFee, 0),
                            status: 'succeeded',
                            metadata: { local: true },
                        });
                        if (transactionError)
                            throw transactionError;
                    }
                }
                const url = `${env.WEB_URL}/eventos/${event.slug}/checkout/success?registration_id=${registrations[0].id}&mock=${payments.provider === 'mock'}`;
                return {
                    checkoutId: payments.provider === 'mock' ? `mock_${checkoutGroupId}` : 'free',
                    url,
                    registrationId: registrations[0].id,
                };
            }
            const checkout = await payments.createCheckout({
                externalId: checkoutGroupId,
                items: checkoutItems,
                methods: ['PIX', 'CARD'],
                returnUrl: `${env.WEB_URL}/eventos/${event.slug}/checkout/cancel?checkout_id=${checkoutGroupId}`,
                completionUrl: `${env.WEB_URL}/eventos/${event.slug}/checkout/success?checkout_id=${checkoutGroupId}`,
                metadata: {
                    event_id: event.id,
                    user_id: auth.user.id,
                    registration_ids: registrationIds.join(','),
                },
            });
            externalCheckoutCreated = true;
            const { error: checkoutUpdateError } = await clients.admin
                .from('event_registrations')
                .update({ provider_checkout_id: checkout.id })
                .in('id', registrationIds);
            if (checkoutUpdateError) {
                request.log.error({ err: checkoutUpdateError, checkoutId: checkout.id }, 'Failed to persist checkout id');
            }
            return { checkoutId: checkout.id, url: checkout.url, registrationId: registrations[0].id };
        }
        catch (error) {
            if (!externalCheckoutCreated && registrations.length) {
                const registrationIds = registrations.map((registration) => registration.id);
                if (inventoryReserved) {
                    await releaseInventory(registrationIds).catch((releaseError) => {
                        request.log.error({ err: releaseError, registrationIds }, 'Failed to release checkout inventory');
                    });
                }
                const { error: cleanupError } = await clients.admin
                    .from('event_registrations')
                    .update({
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: 'Falha ao iniciar o pagamento.',
                    payment_method: null,
                    payment_status: null,
                    status: 'cancelled',
                })
                    .in('id', registrationIds);
                if (cleanupError) {
                    request.log.error({ err: cleanupError, registrationIds }, 'Failed to cancel incomplete checkout');
                }
            }
            throw error;
        }
    });
    app.post('/api/checkout/installments', async (request) => {
        const auth = await requireUser(request, clients);
        await limitPaymentOperation('installment-checkout', auth.user.id, 5);
        const input = z
            .object({
            ticket_id: z.string().uuid(),
            quantity: z.number().int().positive(),
            installments: z.number().int().min(2).max(12),
            participant_name: z.string().trim().min(1),
            participant_email: z.string().email(),
            participant_phone: z.string().optional(),
            participant_document: z.string().optional(),
        })
            .parse(request.body);
        const { data: ticket, error: ticketError } = await clients.admin
            .from('event_tickets')
            .select('*,event_id:events(*)')
            .eq('id', input.ticket_id)
            .maybeSingle();
        if (ticketError)
            throw ticketError;
        if (!ticket || !ticket.allow_installments || input.installments > Number(ticket.max_installments ?? 0)) {
            throw new ApiError('Parcelamento indisponível para este ingresso.', 422, 'INSTALLMENTS_UNAVAILABLE');
        }
        try {
            if (ticket.event_id.status !== 'published')
                throw new CheckoutRuleViolation('ticket_unavailable');
            assertRegistrationOpen({ end: ticket.event_id.registration_end, start: ticket.event_id.registration_start });
            assertTicketAvailable({
                id: ticket.id,
                maxQuantityPerPurchase: Number(ticket.max_quantity_per_purchase ?? 10),
                minQuantityPerPurchase: Number(ticket.min_quantity_per_purchase ?? 1),
                price: Number(ticket.price),
                quantity: Number(ticket.quantity),
                quantitySold: Number(ticket.quantity_sold),
                saleEndDate: ticket.sale_end_date,
                saleStartDate: ticket.sale_start_date,
                serviceFeeType: ticket.service_fee_type,
                status: ticket.status,
                visibility: ticket.visibility,
            }, input.quantity);
        }
        catch (error) {
            if (error instanceof CheckoutRuleViolation)
                throw checkoutRuleError(error);
            throw error;
        }
        const total = money(Number(ticket.buyer_price ?? ticket.price) * input.quantity);
        let installmentAmounts;
        try {
            installmentAmounts = buildInstallmentAmounts(total, input.installments, Number(ticket.min_amount_for_installments ?? 0));
        }
        catch (error) {
            if (error instanceof InstallmentPlanUnavailable) {
                throw new ApiError('O valor não atende aos requisitos para parcelamento.', 422, 'INSTALLMENTS_UNAVAILABLE');
            }
            throw error;
        }
        const { data: registration, error } = await clients.admin
            .from('event_registrations')
            .insert({
            event_id: ticket.event_id.id,
            ticket_type_id: ticket.id,
            user_id: auth.user.id,
            participant_name: input.participant_name,
            participant_email: input.participant_email,
            participant_phone: input.participant_phone ?? null,
            participant_document: input.participant_document ?? null,
            ticket_code: ticketCode(),
            status: 'partial_payment',
            payment_status: 'pending',
            quantity: input.quantity,
            unit_price: ticket.price,
            total_amount: total,
            payment_amount: 0,
            payment_method: 'pix',
            payment_provider: payments.provider,
            is_installment_payment: true,
            total_installments: input.installments,
            installment_plan_status: 'active',
        })
            .select('*')
            .single();
        if (error)
            throw error;
        let inventoryReserved = false;
        try {
            const installmentRows = Array.from({ length: input.installments }, (_, index) => ({
                registration_id: registration.id,
                installment_number: index + 1,
                total_installments: input.installments,
                amount: installmentAmounts[index],
                due_date: new Date(Date.now() + index * 30 * 24 * 60 * 60 * 1000).toISOString(),
                status: 'pending',
            }));
            const { data: installments, error: installmentsError } = await clients.admin
                .from('payment_installments')
                .insert(installmentRows)
                .select('*');
            if (installmentsError)
                throw installmentsError;
            await reserveInventory([registration.id]);
            inventoryReserved = true;
            const first = installments[0];
            const charge = await payments.createPixCharge({
                externalId: first.id,
                amountInCents: Math.round(Number(first.amount) * 100),
                description: `${ticket.event_id.title} · parcela 1/${input.installments}`,
                expiresInSeconds: 86_400,
                customer: {
                    name: input.participant_name,
                    email: input.participant_email,
                    taxId: input.participant_document,
                    cellphone: input.participant_phone,
                },
                metadata: { registration_id: registration.id, installment_id: first.id },
            });
            const { error: chargeUpdateError } = await clients.admin
                .from('payment_installments')
                .update({
                provider_transaction_id: charge.id,
                pix_qr_code_base64: charge.qrCodeBase64,
                pix_copy_paste: charge.copyPasteCode,
            })
                .eq('id', first.id);
            if (chargeUpdateError) {
                request.log.error({ err: chargeUpdateError, installmentId: first.id, providerTransactionId: charge.id }, 'Failed to persist installment charge');
            }
            return {
                success: true,
                registration_id: registration.id,
                total_amount: total,
                installments,
                first_installment: {
                    id: first.id,
                    amount: first.amount,
                    pix_qr_code: charge.qrCodeBase64,
                    pix_copy_paste: charge.copyPasteCode,
                    provider_transaction_id: charge.id,
                    expires_at: charge.expiresAt,
                },
            };
        }
        catch (error) {
            if (inventoryReserved) {
                await releaseInventory([registration.id]).catch((releaseError) => {
                    request.log.error({ err: releaseError, registrationId: registration.id }, 'Failed to release inventory');
                });
            }
            await Promise.all([
                clients.admin
                    .from('payment_installments')
                    .update({ status: 'cancelled' })
                    .eq('registration_id', registration.id),
                clients.admin
                    .from('event_registrations')
                    .update({
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: 'Falha ao iniciar o parcelamento.',
                    installment_plan_status: 'defaulted',
                    payment_status: null,
                    status: 'cancelled',
                })
                    .eq('id', registration.id),
            ]);
            throw error;
        }
    });
    app.post('/api/installments/:id/generate-pix', async (request) => {
        const auth = await requireUser(request, clients);
        await limitPaymentOperation('installment-pix', auth.user.id, 5);
        const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
        const { data: installment, error } = await clients.admin
            .from('payment_installments')
            .select('*,registration_id:event_registrations!inner(*,event_id:events(*))')
            .eq('id', id)
            .eq('registration_id.user_id', auth.user.id)
            .maybeSingle();
        if (error)
            throw error;
        if (!installment)
            throw new ApiError('Parcela não encontrada.', 404, 'INSTALLMENT_NOT_FOUND');
        if (installment.status === 'paid')
            throw new ApiError('Esta parcela já foi paga.', 409, 'INSTALLMENT_ALREADY_PAID');
        const registration = installment.registration_id;
        const charge = await payments.createPixCharge({
            externalId: installment.id,
            amountInCents: Math.round(Number(installment.amount) * 100),
            description: `${registration.event_id.title} · parcela ${installment.installment_number}/${installment.total_installments}`,
            expiresInSeconds: 86_400,
            customer: {
                name: registration.participant_name,
                email: registration.participant_email,
                taxId: registration.participant_document ?? undefined,
                cellphone: registration.participant_phone ?? undefined,
            },
            metadata: { registration_id: registration.id, installment_id: installment.id },
        });
        await clients.admin
            .from('payment_installments')
            .update({
            provider_transaction_id: charge.id,
            pix_qr_code_base64: charge.qrCodeBase64,
            pix_copy_paste: charge.copyPasteCode,
        })
            .eq('id', id);
        return {
            installment,
            payment: {
                provider_transaction_id: charge.id,
                pix_qr_code: charge.qrCodeBase64,
                pix_copy_paste: charge.copyPasteCode,
                expires_at: charge.expiresAt,
                amount: Number(installment.amount),
            },
            event: { id: registration.event_id.id, name: registration.event_id.title },
        };
    });
    app.post('/api/payments/webhooks/abacatepay', { config: { rawBody: true } }, async (request, reply) => {
        if (payments.provider === 'mock')
            return { received: true, mode: 'mock' };
        const { webhookSecret } = z.object({ webhookSecret: z.string().optional() }).parse(request.query ?? {});
        if (!env.ABACATEPAY_WEBHOOK_SECRET || webhookSecret !== env.ABACATEPAY_WEBHOOK_SECRET) {
            throw new ApiError('Secret do webhook inválido.', 401, 'INVALID_WEBHOOK_SECRET');
        }
        const signatureHeader = request.headers['x-webhook-signature'] ?? request.headers['x-abacate-signature'];
        const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
        const rawBody = request.rawBody;
        if (!signature || !rawBody || !verifyAbacatePayWebhook(rawBody, signature)) {
            throw new ApiError('Assinatura do webhook inválida.', 401, 'INVALID_WEBHOOK_SIGNATURE');
        }
        let decodedPayload;
        try {
            decodedPayload = JSON.parse(rawBody.toString('utf8'));
        }
        catch {
            throw new ApiError('Payload do webhook inválido.', 400, 'INVALID_WEBHOOK_PAYLOAD');
        }
        const payload = webhookPayloadSchema.parse(decodedPayload);
        const eventType = payload.event;
        const transparent = payload.data?.transparent;
        if (transparent?.id && eventType.startsWith('transparent.')) {
            let installmentQuery = clients.admin
                .from('payment_installments')
                .select('*,registration_id:event_registrations(*)')
                .eq('provider_transaction_id', transparent.id);
            if (transparent.externalId) {
                installmentQuery = clients.admin
                    .from('payment_installments')
                    .select('*,registration_id:event_registrations(*)')
                    .or(`provider_transaction_id.eq.${transparent.id},id.eq.${transparent.externalId}`);
            }
            const { data: installment, error: installmentError } = await installmentQuery.maybeSingle();
            if (installmentError)
                throw installmentError;
            if (!installment)
                return reply.send({ received: true, ignored: 'installment_not_found' });
            const registration = installment.registration_id;
            const providerFee = Number(transparent.platformFee ?? 0) / 100;
            if (eventType === 'transparent.completed' && installment.status !== 'paid') {
                await reserveInventory([registration.id]);
                const now = new Date().toISOString();
                const { error: updateInstallmentError } = await clients.admin
                    .from('payment_installments')
                    .update({
                    status: 'paid',
                    paid_at: now,
                    payment_confirmed_at: now,
                })
                    .eq('id', installment.id);
                if (updateInstallmentError)
                    throw updateInstallmentError;
                const { data: plan, error: planError } = await clients.admin
                    .from('payment_installments')
                    .select('amount,status')
                    .eq('registration_id', registration.id);
                if (planError)
                    throw planError;
                const paidAmount = (plan ?? [])
                    .filter((item) => item.status === 'paid')
                    .reduce((sum, item) => sum + Number(item.amount), 0);
                const allPaid = (plan ?? []).every((item) => item.status === 'paid');
                const { error: registrationError } = await clients.admin
                    .from('event_registrations')
                    .update({
                    status: allPaid ? 'confirmed' : 'partial_payment',
                    payment_status: allPaid ? 'paid' : 'pending',
                    payment_amount: money(Math.min(Number(registration.total_amount), paidAmount)),
                    provider_fee: money(Number(registration.provider_fee ?? 0) + providerFee),
                    provider_transaction_id: transparent.id,
                })
                    .eq('id', registration.id);
                if (registrationError)
                    throw registrationError;
            }
            else if (eventType === 'transparent.refunded' ||
                eventType === 'transparent.lost' ||
                ((eventType === 'transparent.expired' || eventType === 'transparent.cancelled') &&
                    installment.installment_number === 1 &&
                    Number(registration.payment_amount ?? 0) === 0)) {
                await releaseInventory([registration.id]);
                const now = new Date().toISOString();
                const { error: installmentCancellationError } = await clients.admin
                    .from('payment_installments')
                    .update({ status: 'cancelled' })
                    .eq('registration_id', registration.id)
                    .neq('status', 'paid');
                if (installmentCancellationError)
                    throw installmentCancellationError;
                const { error: registrationCancellationError } = await clients.admin
                    .from('event_registrations')
                    .update({
                    cancelled_at: now,
                    cancelled_reason: eventType === 'transparent.refunded'
                        ? 'Pagamento reembolsado pelo provedor.'
                        : eventType === 'transparent.lost'
                            ? 'Disputa perdida no provedor.'
                            : 'Primeira cobrança PIX encerrada sem pagamento.',
                    installment_plan_status: 'defaulted',
                    payment_status: eventType === 'transparent.refunded' ? 'refunded' : null,
                    status: 'cancelled',
                })
                    .eq('id', registration.id);
                if (registrationCancellationError)
                    throw registrationCancellationError;
            }
            const providerEventId = `${eventType}:${transparent.id}:${installment.id}`;
            const { error: transactionError } = await clients.admin.from('payment_transactions').upsert({
                registration_id: registration.id,
                provider: 'abacatepay',
                provider_event_id: providerEventId,
                provider_object_id: transparent.id,
                event_type: eventType,
                amount: Number(installment.amount),
                provider_fee: providerFee,
                platform_fee: 0,
                organizer_net: Math.max(0, money(Number(installment.amount) - providerFee)),
                status: eventType === 'transparent.completed'
                    ? 'succeeded'
                    : eventType === 'transparent.refunded'
                        ? 'refunded'
                        : eventType === 'transparent.disputed'
                            ? 'pending'
                            : 'failed',
                metadata: payload,
            }, { onConflict: 'provider_event_id' });
            if (transactionError)
                throw transactionError;
            return reply.send({ received: true });
        }
        if (eventType === 'payout.completed' ||
            eventType === 'payout.failed' ||
            eventType === 'transfer.completed' ||
            eventType === 'transfer.failed') {
            const movement = payload.data?.payout ?? payload.data?.transfer ?? payload.data;
            if (movement?.id) {
                const update = {
                    status: eventType.endsWith('.completed') ? 'completed' : 'failed',
                    receipt_url: movement.receiptUrl ?? null,
                    failure_reason: eventType.endsWith('.failed')
                        ? String(movement.reason ?? 'Falha informada pelo provedor.')
                        : null,
                    processed_at: new Date().toISOString(),
                };
                let payoutUpdate = clients.admin.from('organizer_payouts').update(update).eq('provider_payout_id', movement.id);
                if (movement.externalId) {
                    payoutUpdate = clients.admin
                        .from('organizer_payouts')
                        .update(update)
                        .or(`provider_payout_id.eq.${movement.id},id.eq.${movement.externalId}`);
                }
                const { error: payoutUpdateError } = await payoutUpdate;
                if (payoutUpdateError)
                    throw payoutUpdateError;
            }
            return reply.send({ received: true });
        }
        const checkout = payload.data?.checkout;
        if (!checkout?.id || !eventType.startsWith('checkout.'))
            return reply.send({ received: true });
        let { data: registrations, error } = await clients.admin
            .from('event_registrations')
            .select('*')
            .eq('provider_checkout_id', checkout.id);
        if (error)
            throw error;
        if (!registrations?.length && checkout.externalId) {
            const fallback = await clients.admin
                .from('event_registrations')
                .select('*')
                .contains('additional_info', { checkout_group_id: checkout.externalId });
            if (fallback.error)
                throw fallback.error;
            registrations = fallback.data;
            if (registrations?.length) {
                const { error: checkoutLinkError } = await clients.admin
                    .from('event_registrations')
                    .update({ provider_checkout_id: checkout.id })
                    .in('id', registrations.map((registration) => registration.id));
                if (checkoutLinkError)
                    throw checkoutLinkError;
            }
        }
        if (!registrations?.length)
            return reply.send({ received: true, ignored: 'checkout_not_found' });
        const total = (registrations ?? []).reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
        const providerFeeTotal = Number(checkout.platformFee ?? 0) / 100;
        const paymentMethod = readPaymentMethod(payload.data?.payerInformation?.method ?? checkout.methods?.[0]);
        for (const registration of registrations ?? []) {
            const wasPaid = registration.payment_status === 'paid';
            const share = total > 0 ? Number(registration.total_amount ?? 0) / total : 0;
            const providerFee = money(providerFeeTotal * share);
            const platformFee = Number(registration.platform_fee ?? 0);
            const transactionStatus = eventType === 'checkout.completed'
                ? 'succeeded'
                : eventType === 'checkout.refunded'
                    ? 'refunded'
                    : eventType === 'checkout.disputed'
                        ? 'pending'
                        : 'failed';
            if (eventType === 'checkout.completed') {
                if (!wasPaid)
                    await reserveInventory([registration.id]);
                const { error: registrationError } = await clients.admin
                    .from('event_registrations')
                    .update({
                    status: 'confirmed',
                    payment_status: 'paid',
                    payment_method: paymentMethod,
                    provider_transaction_id: checkout.id,
                    provider_fee: providerFee,
                })
                    .eq('id', registration.id);
                if (registrationError)
                    throw registrationError;
            }
            else if (eventType === 'checkout.refunded' || eventType === 'checkout.lost') {
                await releaseInventory([registration.id]);
                const { error: cancellationError } = await clients.admin
                    .from('event_registrations')
                    .update({
                    cancelled_at: new Date().toISOString(),
                    cancelled_reason: eventType === 'checkout.refunded'
                        ? 'Pagamento reembolsado pelo provedor.'
                        : 'Disputa perdida no provedor.',
                    payment_status: eventType === 'checkout.refunded' ? 'refunded' : null,
                    provider_refund_id: eventType === 'checkout.refunded' ? checkout.id : null,
                    status: 'cancelled',
                })
                    .eq('id', registration.id);
                if (cancellationError)
                    throw cancellationError;
            }
            const providerEventId = `${eventType}:${checkout.id}:${registration.id}`;
            const { error: transactionError } = await clients.admin.from('payment_transactions').upsert({
                registration_id: registration.id,
                provider: 'abacatepay',
                provider_event_id: providerEventId,
                provider_object_id: checkout.id,
                event_type: eventType,
                amount: Number(registration.total_amount),
                provider_fee: providerFee,
                platform_fee: platformFee,
                organizer_net: calculateOrganizerNet(Number(registration.payment_amount ?? 0), Number(registration.total_amount ?? 0), platformFee, providerFee),
                status: transactionStatus,
                metadata: payload,
            }, { onConflict: 'provider_event_id' });
            if (transactionError)
                throw transactionError;
        }
        return reply.send({ received: true });
    });
}
//# sourceMappingURL=payments.js.map