import crypto from 'node:crypto';
import { assertRegistrationOpen, assertTicketAvailable, buildCheckoutPlan, CheckoutRuleViolation, } from './checkout-plan.js';
import { calculateOrganizerNet } from './fees.js';
import { CheckoutNotFound } from './get-checkout-status.js';
import { buildInstallmentAmounts, InstallmentPlanUnavailable } from './installment-plan.js';
import { TicketInventoryUnavailable } from './manage-ticket-inventory.js';
import { RateLimitExceeded } from '../security/rate-limit.js';
import { ApiError } from '../../shared/errors.js';
export class PaymentService {
    repository;
    gateway;
    inventory;
    checkoutStatus;
    rateLimit;
    webUrl;
    now;
    constructor(repository, gateway, inventory, checkoutStatus, rateLimit, webUrl, now = () => new Date()) {
        this.repository = repository;
        this.gateway = gateway;
        this.inventory = inventory;
        this.checkoutStatus = checkoutStatus;
        this.rateLimit = rateLimit;
        this.webUrl = webUrl;
        this.now = now;
    }
    async getStatus(userId, lookup) {
        try {
            return await this.checkoutStatus.execute(userId, lookup);
        }
        catch (error) {
            if (error instanceof CheckoutNotFound)
                throw new ApiError('Compra não encontrada.', 404, 'CHECKOUT_NOT_FOUND');
            throw error;
        }
    }
    async checkout(userId, input, logger) {
        await this.limit('checkout', userId, 8);
        const [event, configuration] = await Promise.all([
            this.repository.findCheckoutEvent(input.eventId),
            this.repository.getConfiguration(),
        ]);
        if (!event)
            throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');
        const checkoutGroupId = crypto.randomUUID();
        const registrations = [];
        const checkoutItems = [];
        let plan;
        try {
            plan = buildCheckoutPlan({
                configuration,
                registrationWindow: { end: event.registration_end, start: event.registration_start },
                selections: input.tickets,
                tickets: event.tickets.map(ticketSnapshot),
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
                const ticket = event.tickets.find((candidate) => candidate.id === item.ticket.id);
                const registration = await this.repository.createRegistration({
                    event_id: event.id,
                    ticket_type_id: ticket.id,
                    user_id: userId,
                    participant_name: input.participantInfo.name,
                    participant_email: input.participantInfo.email,
                    participant_phone: input.participantInfo.phone ?? null,
                    participant_document: input.participantInfo.document ?? null,
                    ticket_code: ticketCode(),
                    status: item.totalAmount === 0 || this.gateway.provider === 'mock' ? 'confirmed' : 'pending',
                    payment_status: item.totalAmount === 0 ? 'free' : this.gateway.provider === 'mock' ? 'paid' : 'pending',
                    payment_amount: item.baseAmount,
                    quantity: item.quantity,
                    unit_price: Number(ticket.price),
                    service_fee: item.serviceFee,
                    platform_fee: item.platformFee,
                    provider_fee: 0,
                    total_amount: item.totalAmount,
                    payment_method: item.totalAmount === 0 ? 'free' : this.gateway.provider === 'mock' ? 'pix' : null,
                    payment_provider: this.gateway.provider,
                    additional_info: { checkout_group_id: checkoutGroupId },
                });
                registrations.push(registration);
                if (item.totalAmount > 0 && this.gateway.provider !== 'mock') {
                    let productId = ticket.provider_product_id;
                    if (!productId) {
                        const unitPrice = money(item.totalAmount / item.quantity);
                        const product = await this.gateway.createProduct({
                            externalId: `${ticket.id}:${Math.round(unitPrice * 100)}`,
                            name: ticket.title,
                            description: `${event.title} · ingresso`,
                            priceInCents: Math.round(unitPrice * 100),
                        });
                        productId = product.id;
                        await this.repository.setTicketProviderProduct(ticket.id, productId);
                    }
                    checkoutItems.push({ productId, quantity: item.quantity });
                }
            }
            const ids = registrations.map((registration) => registration.id);
            await this.reserveInventory(ids);
            inventoryReserved = true;
            if (allFree || this.gateway.provider === 'mock') {
                for (const registration of registrations) {
                    if (registration.payment_status !== 'paid')
                        continue;
                    const platformFee = Number(registration.platform_fee ?? 0);
                    await this.repository.recordTransaction({
                        registration_id: registration.id,
                        provider: 'mock',
                        provider_event_id: `mock:${checkoutGroupId}:${registration.id}`,
                        provider_object_id: checkoutGroupId,
                        event_type: 'checkout.completed',
                        amount: Number(registration.total_amount),
                        provider_fee: 0,
                        platform_fee: platformFee,
                        organizer_net: calculateOrganizerNet(Number(registration.payment_amount ?? 0), Number(registration.total_amount), platformFee, 0),
                        status: 'succeeded',
                        metadata: { local: true },
                    });
                }
                return {
                    checkoutId: this.gateway.provider === 'mock' ? `mock_${checkoutGroupId}` : 'free',
                    url: `${this.webUrl}/eventos/${event.slug}/checkout/success?registration_id=${registrations[0].id}&mock=${this.gateway.provider === 'mock'}`,
                    registrationId: registrations[0].id,
                };
            }
            const checkout = await this.gateway.createCheckout({
                externalId: checkoutGroupId,
                items: checkoutItems,
                methods: ['PIX', 'CARD'],
                returnUrl: `${this.webUrl}/eventos/${event.slug}/checkout/cancel?checkout_id=${checkoutGroupId}`,
                completionUrl: `${this.webUrl}/eventos/${event.slug}/checkout/success?checkout_id=${checkoutGroupId}`,
                metadata: { event_id: event.id, user_id: userId, registration_ids: ids.join(',') },
            });
            externalCheckoutCreated = true;
            await this.repository
                .linkCheckout(ids, checkout.id)
                .catch((error) => logger.error({ err: error, checkoutId: checkout.id }, 'Failed to persist checkout id'));
            return { checkoutId: checkout.id, url: checkout.url, registrationId: registrations[0].id };
        }
        catch (error) {
            if (!externalCheckoutCreated && registrations.length) {
                const ids = registrations.map((registration) => registration.id);
                if (inventoryReserved)
                    await this.releaseInventory(ids).catch((cause) => logger.error({ err: cause, registrationIds: ids }, 'Failed to release checkout inventory'));
                await this.repository
                    .cancelIncompleteCheckout(ids, 'Falha ao iniciar o pagamento.')
                    .catch((cause) => logger.error({ err: cause, registrationIds: ids }, 'Failed to cancel incomplete checkout'));
            }
            throw error;
        }
    }
    async createInstallmentCheckout(userId, input, logger) {
        await this.limit('installment-checkout', userId, 5);
        const ticket = await this.repository.findTicketForInstallments(input.ticket_id);
        if (!ticket || !ticket.allow_installments || input.installments > Number(ticket.max_installments ?? 0)) {
            throw new ApiError('Parcelamento indisponível para este ingresso.', 422, 'INSTALLMENTS_UNAVAILABLE');
        }
        try {
            if (ticket.event_id.status !== 'published')
                throw new CheckoutRuleViolation('ticket_unavailable');
            assertRegistrationOpen({ end: ticket.event_id.registration_end, start: ticket.event_id.registration_start });
            assertTicketAvailable(ticketSnapshot(ticket), input.quantity);
        }
        catch (error) {
            if (error instanceof CheckoutRuleViolation)
                throw checkoutRuleError(error);
            throw error;
        }
        const total = money(Number(ticket.buyer_price ?? ticket.price) * input.quantity);
        let amounts;
        try {
            amounts = buildInstallmentAmounts(total, input.installments, Number(ticket.min_amount_for_installments ?? 0));
        }
        catch (error) {
            if (error instanceof InstallmentPlanUnavailable)
                throw new ApiError('O valor não atende aos requisitos para parcelamento.', 422, 'INSTALLMENTS_UNAVAILABLE');
            throw error;
        }
        const registration = await this.repository.createRegistration({
            event_id: ticket.event_id.id,
            ticket_type_id: ticket.id,
            user_id: userId,
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
            payment_provider: this.gateway.provider,
            is_installment_payment: true,
            total_installments: input.installments,
            installment_plan_status: 'active',
        });
        let inventoryReserved = false;
        try {
            const installments = await this.repository.createInstallments(Array.from({ length: input.installments }, (_, index) => ({
                registration_id: registration.id,
                installment_number: index + 1,
                total_installments: input.installments,
                amount: amounts[index],
                due_date: new Date(this.now().getTime() + index * 30 * 86_400_000).toISOString(),
                status: 'pending',
            })));
            await this.reserveInventory([registration.id]);
            inventoryReserved = true;
            const first = installments[0];
            const charge = await this.createCharge(first, registration, ticket.event_id.title);
            await this.repository
                .setInstallmentCharge(first.id, {
                providerId: charge.id,
                qrCode: charge.qrCodeBase64,
                copyPaste: charge.copyPasteCode,
            })
                .catch((error) => logger.error({ err: error, installmentId: first.id, providerTransactionId: charge.id }, 'Failed to persist installment charge'));
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
            if (inventoryReserved)
                await this.releaseInventory([registration.id]).catch((cause) => logger.error({ err: cause, registrationId: registration.id }, 'Failed to release inventory'));
            await this.repository
                .cancelInstallmentPlan(registration.id, 'Falha ao iniciar o parcelamento.')
                .catch((cause) => logger.error({ err: cause, registrationId: registration.id }, 'Failed to cancel installment plan'));
            throw error;
        }
    }
    async generateInstallmentPix(userId, id) {
        await this.limit('installment-pix', userId, 5);
        const installment = await this.repository.findInstallmentForUser(id, userId);
        if (!installment)
            throw new ApiError('Parcela não encontrada.', 404, 'INSTALLMENT_NOT_FOUND');
        if (installment.status === 'paid')
            throw new ApiError('Esta parcela já foi paga.', 409, 'INSTALLMENT_ALREADY_PAID');
        const registration = installment.registration_id;
        const charge = await this.createCharge(installment, registration, registration.event_id.title);
        await this.repository.setInstallmentCharge(id, {
            providerId: charge.id,
            qrCode: charge.qrCodeBase64,
            copyPaste: charge.copyPasteCode,
        });
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
    }
    async processWebhook(payload) {
        const eventType = payload.event;
        const transparent = payload.data?.transparent;
        if (transparent?.id && eventType.startsWith('transparent.'))
            return this.processTransparentWebhook(payload, transparent);
        if (['payout.completed', 'payout.failed', 'transfer.completed', 'transfer.failed'].includes(eventType)) {
            const movement = payload.data?.payout ?? payload.data?.transfer ?? movementFromData(payload.data);
            if (movement?.id)
                await this.repository.updatePayoutForWebhook(movement.id, movement.externalId, {
                    status: eventType.endsWith('.completed') ? 'completed' : 'failed',
                    receipt_url: movement.receiptUrl ?? null,
                    failure_reason: eventType.endsWith('.failed')
                        ? String(movement.reason ?? 'Falha informada pelo provedor.')
                        : null,
                    processed_at: this.now().toISOString(),
                });
            return { received: true };
        }
        const checkout = payload.data?.checkout;
        if (!checkout?.id || !eventType.startsWith('checkout.'))
            return { received: true };
        const registrations = await this.repository.findCheckoutRegistrations(checkout.id, checkout.externalId);
        if (!registrations.length)
            return { received: true, ignored: 'checkout_not_found' };
        const total = registrations.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
        const providerFeeTotal = Number(checkout.platformFee ?? 0) / 100;
        const method = readPaymentMethod(payload.data?.payerInformation?.method ?? checkout.methods?.[0]);
        for (const registration of registrations)
            await this.processCheckoutRegistration(payload, checkout, registration, total, providerFeeTotal, method);
        return { received: true };
    }
    async processTransparentWebhook(payload, transparent) {
        const eventType = payload.event;
        const installment = await this.repository.findInstallmentForWebhook(transparent.id, transparent.externalId);
        if (!installment)
            return { received: true, ignored: 'installment_not_found' };
        const registration = installment.registration_id;
        const providerFee = Number(transparent.platformFee ?? 0) / 100;
        if (eventType === 'transparent.completed') {
            await this.repository.settleInstallmentWebhook({
                chargeId: transparent.id,
                installmentId: installment.id,
                metadata: payload,
                providerFee,
                registrationId: registration.id,
            });
        }
        else if (eventType === 'transparent.refunded' ||
            eventType === 'transparent.lost' ||
            ((eventType === 'transparent.expired' || eventType === 'transparent.cancelled') &&
                installment.installment_number === 1 &&
                Number(registration.payment_amount ?? 0) === 0)) {
            await this.releaseInventory([registration.id]);
            await this.repository.cancelPendingInstallments(registration.id);
            await this.repository.updateRegistration(registration.id, {
                cancelled_at: this.now().toISOString(),
                cancelled_reason: eventType === 'transparent.refunded'
                    ? 'Pagamento reembolsado pelo provedor.'
                    : eventType === 'transparent.lost'
                        ? 'Disputa perdida no provedor.'
                        : 'Primeira cobrança PIX encerrada sem pagamento.',
                installment_plan_status: 'defaulted',
                payment_status: eventType === 'transparent.refunded' ? 'refunded' : null,
                status: 'cancelled',
            });
        }
        if (eventType !== 'transparent.completed') {
            await this.repository.recordTransaction({
                registration_id: registration.id,
                provider: 'abacatepay',
                provider_event_id: `${eventType}:${transparent.id}:${installment.id}`,
                provider_object_id: transparent.id,
                event_type: eventType,
                amount: Number(installment.amount),
                provider_fee: providerFee,
                platform_fee: 0,
                organizer_net: Math.max(0, money(Number(installment.amount) - providerFee)),
                status: eventType === 'transparent.refunded'
                    ? 'refunded'
                    : eventType === 'transparent.disputed'
                        ? 'pending'
                        : 'failed',
                metadata: payload,
            });
        }
        return { received: true };
    }
    async processCheckoutRegistration(payload, checkout, registration, total, providerFeeTotal, paymentMethod) {
        const eventType = payload.event;
        const providerFee = money(providerFeeTotal * (total > 0 ? Number(registration.total_amount ?? 0) / total : 0));
        const platformFee = Number(registration.platform_fee ?? 0);
        if (eventType === 'checkout.completed') {
            if (registration.payment_status !== 'paid')
                await this.reserveInventory([registration.id]);
            await this.repository.updateRegistration(registration.id, {
                status: 'confirmed',
                payment_status: 'paid',
                payment_method: paymentMethod,
                provider_transaction_id: checkout.id,
                provider_fee: providerFee,
            });
        }
        else if (eventType === 'checkout.refunded' || eventType === 'checkout.lost') {
            await this.releaseInventory([registration.id]);
            await this.repository.updateRegistration(registration.id, {
                cancelled_at: this.now().toISOString(),
                cancelled_reason: eventType === 'checkout.refunded' ? 'Pagamento reembolsado pelo provedor.' : 'Disputa perdida no provedor.',
                payment_status: eventType === 'checkout.refunded' ? 'refunded' : null,
                provider_refund_id: eventType === 'checkout.refunded' ? checkout.id : null,
                status: 'cancelled',
            });
        }
        await this.repository.recordTransaction({
            registration_id: registration.id,
            provider: 'abacatepay',
            provider_event_id: `${eventType}:${checkout.id}:${registration.id}`,
            provider_object_id: checkout.id,
            event_type: eventType,
            amount: Number(registration.total_amount),
            provider_fee: providerFee,
            platform_fee: platformFee,
            organizer_net: calculateOrganizerNet(Number(registration.payment_amount ?? 0), Number(registration.total_amount ?? 0), platformFee, providerFee),
            status: eventType === 'checkout.completed'
                ? 'succeeded'
                : eventType === 'checkout.refunded'
                    ? 'refunded'
                    : eventType === 'checkout.disputed'
                        ? 'pending'
                        : 'failed',
            metadata: payload,
        });
    }
    createCharge(installment, registration, eventTitle) {
        return this.gateway.createPixCharge({
            externalId: installment.id,
            amountInCents: Math.round(Number(installment.amount) * 100),
            description: `${eventTitle} · parcela ${installment.installment_number}/${installment.total_installments}`,
            expiresInSeconds: 86_400,
            customer: {
                name: registration.participant_name,
                email: registration.participant_email,
                taxId: registration.participant_document ?? undefined,
                cellphone: registration.participant_phone ?? undefined,
            },
            metadata: { registration_id: registration.id, installment_id: installment.id },
        });
    }
    async reserveInventory(ids) {
        try {
            await this.inventory.reserve(ids);
        }
        catch (error) {
            if (error instanceof TicketInventoryUnavailable)
                throw new ApiError('O estoque mudou durante a compra. Revise a quantidade e tente novamente.', 409, 'INSUFFICIENT_STOCK');
            throw error;
        }
    }
    releaseInventory(ids) {
        return this.inventory.release(ids);
    }
    async limit(scope, userId, limit) {
        try {
            await this.rateLimit.execute({ scope, subject: userId, limit, windowSeconds: 60 });
        }
        catch (error) {
            if (error instanceof RateLimitExceeded)
                throw new ApiError('Muitas tentativas. Aguarde um minuto e tente novamente.', 429, 'RATE_LIMITED');
            throw error;
        }
    }
}
function ticketCode() {
    return `EVT-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}
function ticketSnapshot(ticket) {
    return {
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
    };
}
function checkoutRuleError(error) {
    if (error.rule === 'insufficient_stock') {
        return new ApiError(`Há somente ${error.details.available} ingresso(s) disponível(is).`, 409, 'INSUFFICIENT_STOCK');
    }
    const errors = {
        duplicate_ticket: ['O mesmo tipo de ingresso foi selecionado mais de uma vez.', 'DUPLICATE_TICKET'],
        maximum_quantity: ['Quantidade acima do limite por compra.', 'PURCHASE_LIMIT'],
        minimum_quantity: ['Quantidade abaixo do mínimo por compra.', 'MINIMUM_PURCHASE'],
        registration_closed: ['As inscrições para este evento estão fechadas.', 'REGISTRATION_CLOSED'],
    };
    const [message, code] = errors[error.rule] ?? ['Ingresso indisponível.', 'TICKET_UNAVAILABLE'];
    return new ApiError(message, 422, code);
}
function money(value) {
    return Math.round(value * 100) / 100;
}
function readPaymentMethod(method) {
    const normalized = String(method ?? '').toLowerCase();
    if (normalized === 'card')
        return 'card';
    if (normalized === 'boleto')
        return 'boleto';
    return 'pix';
}
function movementFromData(data) {
    return data?.id
        ? {
            id: data.id,
            externalId: data.externalId,
            reason: data.reason,
            receiptUrl: data.receiptUrl,
        }
        : undefined;
}
//# sourceMappingURL=payment-service.js.map