import crypto from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireUser } from '../application/auth/session.js';
import { calculateOrganizerNet, calculatePlatformFee } from '../application/payments/fees.js';
import type { PaymentGateway } from '../application/payments/payment-gateway.js';
import type { ApiEnv } from '../config/env.js';
import { verifyAbacatePayWebhook } from '../infrastructure/payments/abacatepay-gateway.js';
import type { SupabaseClients } from '../infrastructure/supabase/clients.js';
import { ApiError } from '../shared/errors.js';

function ticketCode() {
  return `EVT-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

const checkoutSchema = z.object({
  eventId: z.string().uuid(),
  tickets: z.array(z.object({
    ticketId: z.string().uuid(),
    quantity: z.number().int().positive(),
  })).min(1),
  participantInfo: z.object({
    name: z.string().trim().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
    document: z.string().optional(),
  }),
});

function money(value: number) {
  return Math.round(value * 100) / 100;
}

function readPaymentMethod(value: unknown): 'pix' | 'card' | 'boleto' {
  const normalized = String(value ?? '').toLowerCase();
  if (normalized === 'card') return 'card';
  if (normalized === 'boleto') return 'boleto';
  return 'pix';
}

export async function paymentRoutes(
  app: FastifyInstance,
  options: { env: ApiEnv; clients: SupabaseClients; payments: PaymentGateway },
) {
  const { env, clients, payments } = options;

  app.post('/api/payments/checkout', async (request) => {
    const auth = await requireUser(request, clients);
    const input = checkoutSchema.parse(request.body);
    const { data: event, error: eventError } = await clients.admin
      .from('events')
      .select('*,organizer_id:organizers(*),tickets:event_tickets(*)')
      .eq('id', input.eventId)
      .eq('status', 'published')
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');

    const { data: configuration, error: configurationError } = await clients.admin
      .from('event_configurations')
      .select('*')
      .eq('id', 1)
      .single();
    if (configurationError) throw configurationError;

    const checkoutGroupId = crypto.randomUUID();
    const registrations: any[] = [];
    const checkoutItems: Array<{ productId: string; quantity: number }> = [];
    let allFree = true;

    for (const selected of input.tickets) {
      const ticket = event.tickets.find((item: any) => item.id === selected.ticketId);
      if (!ticket || ticket.status !== 'active') {
        throw new ApiError('Ingresso indisponível.', 422, 'TICKET_UNAVAILABLE');
      }
      const available = Number(ticket.quantity) - Number(ticket.quantity_sold);
      if (selected.quantity > available) {
        throw new ApiError(`Há somente ${available} ingresso(s) disponível(is).`, 409, 'INSUFFICIENT_STOCK');
      }
      if (selected.quantity > Number(ticket.max_quantity_per_purchase ?? 10)) {
        throw new ApiError('Quantidade acima do limite por compra.', 422, 'PURCHASE_LIMIT');
      }

      const baseAmount = money(Number(ticket.price) * selected.quantity);
      const platformFee = calculatePlatformFee(baseAmount, configuration);
      const serviceFee = ticket.service_fee_type === 'passed_to_buyer' ? platformFee : 0;
      const totalAmount = money(baseAmount + serviceFee);
      allFree = allFree && totalAmount === 0;

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
          quantity: selected.quantity,
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
      if (registrationError) throw registrationError;
      registrations.push(registration);

      if (totalAmount > 0 && payments.provider !== 'mock') {
        let productId = ticket.provider_product_id as string | null;
        if (!productId) {
          const unitPrice = money(totalAmount / selected.quantity);
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
          if (error) throw error;
        }
        checkoutItems.push({ productId, quantity: selected.quantity });
      }
    }

    if (allFree || payments.provider === 'mock') {
      for (const registration of registrations) {
        const { error: inventoryError } = await clients.admin.rpc('increment_ticket_sales', {
          target_ticket: registration.ticket_type_id,
          sold_amount: registration.quantity,
        });
        if (inventoryError) throw inventoryError;
        if (registration.payment_status === 'paid') {
          const platformFee = Number(registration.platform_fee ?? 0);
          const baseAmount = Number(registration.payment_amount ?? 0);
          await clients.admin.from('payment_transactions').insert({
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
      returnUrl: `${env.WEB_URL}/eventos/${event.slug}/checkout/cancel`,
      completionUrl: `${env.WEB_URL}/eventos/${event.slug}/checkout/success?checkout_id=${checkoutGroupId}`,
      metadata: {
        event_id: event.id,
        user_id: auth.user.id,
        registration_ids: registrations.map((item) => item.id).join(','),
      },
    });
    const { error: checkoutUpdateError } = await clients.admin
      .from('event_registrations')
      .update({ provider_checkout_id: checkout.id })
      .in('id', registrations.map((item) => item.id));
    if (checkoutUpdateError) throw checkoutUpdateError;
    return { checkoutId: checkout.id, url: checkout.url, registrationId: registrations[0].id };
  });

  app.post('/api/checkout/installments', async (request) => {
    const auth = await requireUser(request, clients);
    const input = z.object({
      ticket_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      installments: z.number().int().min(2).max(12),
      participant_name: z.string().trim().min(1),
      participant_email: z.string().email(),
      participant_phone: z.string().optional(),
      participant_document: z.string().optional(),
    }).parse(request.body);
    const { data: ticket, error: ticketError } = await clients.admin
      .from('event_tickets')
      .select('*,event_id:events(*)')
      .eq('id', input.ticket_id)
      .maybeSingle();
    if (ticketError) throw ticketError;
    if (!ticket || !ticket.allow_installments || input.installments > Number(ticket.max_installments ?? 0)) {
      throw new ApiError('Parcelamento indisponível para este ingresso.', 422, 'INSTALLMENTS_UNAVAILABLE');
    }
    const total = money(Number(ticket.buyer_price ?? ticket.price) * input.quantity);
    const amount = money(total / input.installments);
    const { data: registration, error } = await clients.admin.from('event_registrations').insert({
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
    }).select('*').single();
    if (error) throw error;

    const installmentRows = Array.from({ length: input.installments }, (_, index) => ({
      registration_id: registration.id,
      installment_number: index + 1,
      total_installments: input.installments,
      amount: index === input.installments - 1 ? money(total - amount * (input.installments - 1)) : amount,
      due_date: new Date(Date.now() + index * 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'pending' as const,
    }));
    const { data: installments, error: installmentsError } = await clients.admin
      .from('payment_installments')
      .insert(installmentRows)
      .select('*');
    if (installmentsError) throw installmentsError;

    const { error: inventoryError } = await clients.admin.rpc('increment_ticket_sales', {
      target_ticket: ticket.id,
      sold_amount: input.quantity,
    });
    if (inventoryError) throw inventoryError;
    const first = installments![0];
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
    await clients.admin.from('payment_installments').update({
      provider_transaction_id: charge.id,
      pix_qr_code_base64: charge.qrCodeBase64,
      pix_copy_paste: charge.copyPasteCode,
    }).eq('id', first.id);
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
  });

  app.post('/api/installments/:id/generate-pix', async (request) => {
    const auth = await requireUser(request, clients);
    const { id } = z.object({ id: z.string().uuid() }).parse(request.params);
    const { data: installment, error } = await clients.admin
      .from('payment_installments')
      .select('*,registration_id:event_registrations!inner(*,event_id:events(*))')
      .eq('id', id)
      .eq('registration_id.user_id', auth.user.id)
      .maybeSingle();
    if (error) throw error;
    if (!installment) throw new ApiError('Parcela não encontrada.', 404, 'INSTALLMENT_NOT_FOUND');
    if (installment.status === 'paid') throw new ApiError('Esta parcela já foi paga.', 409, 'INSTALLMENT_ALREADY_PAID');

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
    await clients.admin.from('payment_installments').update({
      provider_transaction_id: charge.id,
      pix_qr_code_base64: charge.qrCodeBase64,
      pix_copy_paste: charge.copyPasteCode,
    }).eq('id', id);
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
    if (payments.provider === 'mock') return { received: true, mode: 'mock' };
    const { webhookSecret } = z.object({ webhookSecret: z.string().optional() }).parse(request.query ?? {});
    if (!env.ABACATEPAY_WEBHOOK_SECRET || webhookSecret !== env.ABACATEPAY_WEBHOOK_SECRET) {
      throw new ApiError('Secret do webhook inválido.', 401, 'INVALID_WEBHOOK_SECRET');
    }
    const signatureHeader = request.headers['x-webhook-signature'] ?? request.headers['x-abacate-signature'];
    const signature = Array.isArray(signatureHeader) ? signatureHeader[0] : signatureHeader;
    const rawBody = (request as FastifyRequestWithRawBody).rawBody;
    if (!signature || !rawBody || !verifyAbacatePayWebhook(rawBody, signature)) {
      throw new ApiError('Assinatura do webhook inválida.', 401, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const payload = JSON.parse(rawBody.toString('utf8')) as Record<string, any>;
    const eventType = String(payload.event ?? 'unknown');
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
      if (installmentError) throw installmentError;
      if (!installment) return reply.send({ received: true, ignored: 'installment_not_found' });

      const registration = installment.registration_id;
      const providerFee = Number(transparent.platformFee ?? 0) / 100;
      if (eventType === 'transparent.completed' && installment.status !== 'paid') {
        const now = new Date().toISOString();
        const { error: updateInstallmentError } = await clients.admin.from('payment_installments').update({
          status: 'paid',
          paid_at: now,
          payment_confirmed_at: now,
        }).eq('id', installment.id);
        if (updateInstallmentError) throw updateInstallmentError;
        const { data: plan, error: planError } = await clients.admin
          .from('payment_installments')
          .select('amount,status')
          .eq('registration_id', registration.id);
        if (planError) throw planError;
        const paidAmount = (plan ?? []).filter((item) => item.status === 'paid').reduce((sum, item) => sum + Number(item.amount), 0);
        const allPaid = (plan ?? []).every((item) => item.status === 'paid');
        const { error: registrationError } = await clients.admin.from('event_registrations').update({
          status: allPaid ? 'confirmed' : 'partial_payment',
          payment_status: allPaid ? 'paid' : 'pending',
          payment_amount: money(Math.min(Number(registration.total_amount), paidAmount)),
          provider_fee: money(Number(registration.provider_fee ?? 0) + providerFee),
          provider_transaction_id: transparent.id,
        }).eq('id', registration.id);
        if (registrationError) throw registrationError;
      }

      const providerEventId = `${payload.id ?? `${eventType}:${transparent.id}`}:${installment.id}`;
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
        status: eventType === 'transparent.completed' ? 'succeeded' : eventType === 'transparent.refunded' ? 'refunded' : 'failed',
        metadata: payload,
      }, { onConflict: 'provider_event_id' });
      if (transactionError) throw transactionError;
      return reply.send({ received: true });
    }

    if (eventType === 'payout.completed' || eventType === 'payout.failed' || eventType === 'transfer.completed' || eventType === 'transfer.failed') {
      const movement = payload.data?.payout ?? payload.data?.transfer ?? payload.data;
      if (movement?.id) {
        const update = {
          status: eventType.endsWith('.completed') ? 'completed' as const : 'failed' as const,
          receipt_url: movement.receiptUrl ?? null,
          failure_reason: eventType.endsWith('.failed') ? String(movement.reason ?? 'Falha informada pelo provedor.') : null,
          processed_at: new Date().toISOString(),
        };
        let payoutUpdate = clients.admin.from('organizer_payouts').update(update).eq('provider_payout_id', movement.id);
        if (movement.externalId) {
          payoutUpdate = clients.admin.from('organizer_payouts').update(update).or(`provider_payout_id.eq.${movement.id},id.eq.${movement.externalId}`);
        }
        const { error: payoutUpdateError } = await payoutUpdate;
        if (payoutUpdateError) throw payoutUpdateError;
      }
      return reply.send({ received: true });
    }

    const checkout = payload.data?.checkout;
    if (!checkout?.id || !eventType.startsWith('checkout.')) return reply.send({ received: true });

    const { data: registrations, error } = await clients.admin
      .from('event_registrations')
      .select('*')
      .eq('provider_checkout_id', checkout.id);
    if (error) throw error;
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
          : 'failed';

      if (eventType === 'checkout.completed') {
        const { error: registrationError } = await clients.admin.from('event_registrations').update({
          status: 'confirmed',
          payment_status: 'paid',
          payment_method: paymentMethod,
          provider_transaction_id: checkout.id,
          provider_fee: providerFee,
        }).eq('id', registration.id);
        if (registrationError) throw registrationError;
        if (!wasPaid) {
          const { error: inventoryError } = await clients.admin.rpc('increment_ticket_sales', {
            target_ticket: registration.ticket_type_id,
            sold_amount: registration.quantity,
          });
          if (inventoryError) throw inventoryError;
        }
      } else if (eventType === 'checkout.refunded') {
        await clients.admin.from('event_registrations').update({
          payment_status: 'refunded',
          provider_refund_id: checkout.id,
        }).eq('id', registration.id);
      }

      const providerEventId = `${payload.id ?? `${eventType}:${checkout.id}`}:${registration.id}`;
      const { error: transactionError } = await clients.admin.from('payment_transactions').upsert({
        registration_id: registration.id,
        provider: 'abacatepay',
        provider_event_id: providerEventId,
        provider_object_id: checkout.id,
        event_type: eventType,
        amount: Number(registration.total_amount),
        provider_fee: providerFee,
        platform_fee: platformFee,
        organizer_net: calculateOrganizerNet(
          Number(registration.payment_amount ?? 0),
          Number(registration.total_amount ?? 0),
          platformFee,
          providerFee,
        ),
        status: transactionStatus,
        metadata: payload,
      }, { onConflict: 'provider_event_id' });
      if (transactionError) throw transactionError;
    }
    return reply.send({ received: true });
  });
}

interface FastifyRequestWithRawBody {
  rawBody?: Buffer;
}
