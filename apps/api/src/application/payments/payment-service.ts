import crypto from 'node:crypto';
import type { Database, Json } from '@events-manager/contracts';
import {
	assertRegistrationOpen,
	assertTicketAvailable,
	buildCheckoutPlan,
	CheckoutRuleViolation,
	type CheckoutPlanItem,
	type CheckoutTicketSnapshot,
} from './checkout-plan.js';
import { calculateOrganizerNet } from './fees.js';
import { CheckoutNotFound, type GetCheckoutStatus } from './get-checkout-status.js';
import { buildInstallmentAmounts, InstallmentPlanUnavailable } from './installment-plan.js';
import { type ManageTicketInventory, TicketInventoryUnavailable } from './manage-ticket-inventory.js';
import type { PaymentGateway } from './payment-gateway.js';
import { type EnforceRateLimit, RateLimitExceeded } from '../security/rate-limit.js';
import { ApiError } from '../../shared/errors.js';

export type RegistrationRow = Database['public']['Tables']['event_registrations']['Row'];
export type TicketRow = Database['public']['Tables']['event_tickets']['Row'];
type EventRow = Database['public']['Tables']['events']['Row'];
type ConfigurationRow = Database['public']['Tables']['event_configurations']['Row'];
type InstallmentRow = Database['public']['Tables']['payment_installments']['Row'];

export type CheckoutEvent = EventRow & { tickets: TicketRow[] };
export type InstallmentWithRegistration = InstallmentRow & {
	registration_id: RegistrationRow & { event_id: EventRow };
};

export interface CheckoutInput {
	eventId: string;
	participantInfo: { document?: string; email: string; name: string; phone?: string };
	tickets: Array<{ quantity: number; ticketId: string }>;
}

export interface InstallmentCheckoutInput {
	installments: number;
	participant_document?: string;
	participant_email: string;
	participant_name: string;
	participant_phone?: string;
	quantity: number;
	ticket_id: string;
}

export interface WebhookMovement {
	externalId?: string;
	id: string;
	reason?: string;
	receiptUrl?: string | null;
}

export interface PaymentWebhookPayload extends Record<string, unknown> {
	data?: {
		checkout?: WebhookMovement & { methods?: string[]; platformFee?: number | string };
		externalId?: string;
		id?: string;
		payerInformation?: { method?: string };
		payout?: WebhookMovement;
		reason?: string;
		receiptUrl?: string | null;
		transparent?: WebhookMovement & { platformFee?: number | string };
		transfer?: WebhookMovement;
	};
	event: string;
}

export interface PaymentOperationLogger {
	error(context: Record<string, unknown>, message: string): void;
}

export interface PaymentRepository {
	cancelIncompleteCheckout(registrationIds: string[], reason: string): Promise<void>;
	cancelInstallmentPlan(registrationId: string, reason: string): Promise<void>;
	cancelPendingInstallments(registrationId: string): Promise<void>;
	createInstallments(rows: Database['public']['Tables']['payment_installments']['Insert'][]): Promise<InstallmentRow[]>;
	createRegistration(input: Database['public']['Tables']['event_registrations']['Insert']): Promise<RegistrationRow>;
	findCheckoutEvent(id: string): Promise<CheckoutEvent | null>;
	findCheckoutRegistrations(checkoutId: string, externalId?: string): Promise<RegistrationRow[]>;
	findInstallmentForUser(id: string, userId: string): Promise<InstallmentWithRegistration | null>;
	findInstallmentForWebhook(providerId: string, externalId?: string): Promise<InstallmentWithRegistration | null>;
	findTicketForInstallments(id: string): Promise<(TicketRow & { event_id: EventRow }) | null>;
	getConfiguration(): Promise<ConfigurationRow>;
	linkCheckout(registrationIds: string[], checkoutId: string): Promise<void>;
	recordTransaction(input: Database['public']['Tables']['payment_transactions']['Insert']): Promise<void>;
	settleInstallmentWebhook(input: {
		chargeId: string;
		installmentId: string;
		metadata: Json;
		providerFee: number;
		registrationId: string;
	}): Promise<void>;
	setInstallmentCharge(
		id: string,
		input: { providerId: string; qrCode: string | null; copyPaste: string },
	): Promise<void>;
	setTicketProviderProduct(id: string, productId: string): Promise<void>;
	updatePayoutForWebhook(
		providerId: string,
		externalId: string | undefined,
		input: Record<string, unknown>,
	): Promise<void>;
	updateRegistration(id: string, input: Database['public']['Tables']['event_registrations']['Update']): Promise<void>;
}

export class PaymentService {
	constructor(
		private readonly repository: PaymentRepository,
		private readonly gateway: PaymentGateway,
		private readonly inventory: ManageTicketInventory,
		private readonly checkoutStatus: GetCheckoutStatus,
		private readonly rateLimit: EnforceRateLimit,
		private readonly webUrl: string,
		private readonly now: () => Date = () => new Date(),
	) {}

	async getStatus(userId: string, lookup: { checkoutGroupId: string } | { registrationId: string }) {
		try {
			return await this.checkoutStatus.execute(userId, lookup);
		} catch (error) {
			if (error instanceof CheckoutNotFound) throw new ApiError('Compra não encontrada.', 404, 'CHECKOUT_NOT_FOUND');
			throw error;
		}
	}

	async checkout(userId: string, input: CheckoutInput, logger: PaymentOperationLogger) {
		await this.limit('checkout', userId, 8);
		const [event, configuration] = await Promise.all([
			this.repository.findCheckoutEvent(input.eventId),
			this.repository.getConfiguration(),
		]);
		if (!event) throw new ApiError('Evento não encontrado.', 404, 'EVENT_NOT_FOUND');
		const checkoutGroupId = crypto.randomUUID();
		const registrations: RegistrationRow[] = [];
		const checkoutItems: Array<{ productId: string; quantity: number }> = [];
		let plan: CheckoutPlanItem[];
		try {
			plan = buildCheckoutPlan({
				configuration,
				registrationWindow: { end: event.registration_end, start: event.registration_start },
				selections: input.tickets,
				tickets: event.tickets.map(ticketSnapshot),
			});
		} catch (error) {
			if (error instanceof CheckoutRuleViolation) throw checkoutRuleError(error);
			throw error;
		}
		const allFree = plan.every((item) => item.totalAmount === 0);
		let externalCheckoutCreated = false;
		let inventoryReserved = false;
		try {
			for (const item of plan) {
				const ticket = event.tickets.find((candidate) => candidate.id === item.ticket.id)!;
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
					if (registration.payment_status !== 'paid') continue;
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
						organizer_net: calculateOrganizerNet(
							Number(registration.payment_amount ?? 0),
							Number(registration.total_amount),
							platformFee,
							0,
						),
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
		} catch (error) {
			if (!externalCheckoutCreated && registrations.length) {
				const ids = registrations.map((registration) => registration.id);
				if (inventoryReserved)
					await this.releaseInventory(ids).catch((cause) =>
						logger.error({ err: cause, registrationIds: ids }, 'Failed to release checkout inventory'),
					);
				await this.repository
					.cancelIncompleteCheckout(ids, 'Falha ao iniciar o pagamento.')
					.catch((cause) => logger.error({ err: cause, registrationIds: ids }, 'Failed to cancel incomplete checkout'));
			}
			throw error;
		}
	}

	async createInstallmentCheckout(userId: string, input: InstallmentCheckoutInput, logger: PaymentOperationLogger) {
		await this.limit('installment-checkout', userId, 5);
		const ticket = await this.repository.findTicketForInstallments(input.ticket_id);
		if (!ticket || !ticket.allow_installments || input.installments > Number(ticket.max_installments ?? 0)) {
			throw new ApiError('Parcelamento indisponível para este ingresso.', 422, 'INSTALLMENTS_UNAVAILABLE');
		}
		try {
			if (ticket.event_id.status !== 'published') throw new CheckoutRuleViolation('ticket_unavailable');
			assertRegistrationOpen({ end: ticket.event_id.registration_end, start: ticket.event_id.registration_start });
			assertTicketAvailable(ticketSnapshot(ticket), input.quantity);
		} catch (error) {
			if (error instanceof CheckoutRuleViolation) throw checkoutRuleError(error);
			throw error;
		}
		const total = money(Number(ticket.buyer_price ?? ticket.price) * input.quantity);
		let amounts: number[];
		try {
			amounts = buildInstallmentAmounts(total, input.installments, Number(ticket.min_amount_for_installments ?? 0));
		} catch (error) {
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
			const installments = await this.repository.createInstallments(
				Array.from({ length: input.installments }, (_, index) => ({
					registration_id: registration.id,
					installment_number: index + 1,
					total_installments: input.installments,
					amount: amounts[index],
					due_date: new Date(this.now().getTime() + index * 30 * 86_400_000).toISOString(),
					status: 'pending',
				})),
			);
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
				.catch((error) =>
					logger.error(
						{ err: error, installmentId: first.id, providerTransactionId: charge.id },
						'Failed to persist installment charge',
					),
				);
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
		} catch (error) {
			if (inventoryReserved)
				await this.releaseInventory([registration.id]).catch((cause) =>
					logger.error({ err: cause, registrationId: registration.id }, 'Failed to release inventory'),
				);
			await this.repository
				.cancelInstallmentPlan(registration.id, 'Falha ao iniciar o parcelamento.')
				.catch((cause) =>
					logger.error({ err: cause, registrationId: registration.id }, 'Failed to cancel installment plan'),
				);
			throw error;
		}
	}

	async generateInstallmentPix(userId: string, id: string) {
		await this.limit('installment-pix', userId, 5);
		const installment = await this.repository.findInstallmentForUser(id, userId);
		if (!installment) throw new ApiError('Parcela não encontrada.', 404, 'INSTALLMENT_NOT_FOUND');
		if (installment.status === 'paid') throw new ApiError('Esta parcela já foi paga.', 409, 'INSTALLMENT_ALREADY_PAID');
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

	async processWebhook(payload: PaymentWebhookPayload) {
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
		if (!checkout?.id || !eventType.startsWith('checkout.')) return { received: true };
		const registrations = await this.repository.findCheckoutRegistrations(checkout.id, checkout.externalId);
		if (!registrations.length) return { received: true, ignored: 'checkout_not_found' };
		const total = registrations.reduce((sum, row) => sum + Number(row.total_amount ?? 0), 0);
		const providerFeeTotal = Number(checkout.platformFee ?? 0) / 100;
		const method = readPaymentMethod(payload.data?.payerInformation?.method ?? checkout.methods?.[0]);
		for (const registration of registrations)
			await this.processCheckoutRegistration(payload, checkout, registration, total, providerFeeTotal, method);
		return { received: true };
	}

	private async processTransparentWebhook(
		payload: PaymentWebhookPayload,
		transparent: WebhookMovement & { platformFee?: number | string },
	) {
		const eventType = payload.event;
		const installment = await this.repository.findInstallmentForWebhook(transparent.id, transparent.externalId);
		if (!installment) return { received: true, ignored: 'installment_not_found' };
		const registration = installment.registration_id;
		const providerFee = Number(transparent.platformFee ?? 0) / 100;
		if (eventType === 'transparent.completed') {
			await this.repository.settleInstallmentWebhook({
				chargeId: transparent.id,
				installmentId: installment.id,
				metadata: payload as Json,
				providerFee,
				registrationId: registration.id,
			});
		} else if (
			eventType === 'transparent.refunded' ||
			eventType === 'transparent.lost' ||
			((eventType === 'transparent.expired' || eventType === 'transparent.cancelled') &&
				installment.installment_number === 1 &&
				Number(registration.payment_amount ?? 0) === 0)
		) {
			await this.releaseInventory([registration.id]);
			await this.repository.cancelPendingInstallments(registration.id);
			await this.repository.updateRegistration(registration.id, {
				cancelled_at: this.now().toISOString(),
				cancelled_reason:
					eventType === 'transparent.refunded'
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
				status:
					eventType === 'transparent.refunded'
						? 'refunded'
						: eventType === 'transparent.disputed'
							? 'pending'
							: 'failed',
				metadata: payload as Json,
			});
		}
		return { received: true };
	}

	private async processCheckoutRegistration(
		payload: PaymentWebhookPayload,
		checkout: WebhookMovement,
		registration: RegistrationRow,
		total: number,
		providerFeeTotal: number,
		paymentMethod: string,
	) {
		const eventType = payload.event;
		const providerFee = money(providerFeeTotal * (total > 0 ? Number(registration.total_amount ?? 0) / total : 0));
		const platformFee = Number(registration.platform_fee ?? 0);
		if (eventType === 'checkout.completed') {
			if (registration.payment_status !== 'paid') await this.reserveInventory([registration.id]);
			await this.repository.updateRegistration(registration.id, {
				status: 'confirmed',
				payment_status: 'paid',
				payment_method: paymentMethod,
				provider_transaction_id: checkout.id,
				provider_fee: providerFee,
			});
		} else if (eventType === 'checkout.refunded' || eventType === 'checkout.lost') {
			await this.releaseInventory([registration.id]);
			await this.repository.updateRegistration(registration.id, {
				cancelled_at: this.now().toISOString(),
				cancelled_reason:
					eventType === 'checkout.refunded' ? 'Pagamento reembolsado pelo provedor.' : 'Disputa perdida no provedor.',
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
			organizer_net: calculateOrganizerNet(
				Number(registration.payment_amount ?? 0),
				Number(registration.total_amount ?? 0),
				platformFee,
				providerFee,
			),
			status:
				eventType === 'checkout.completed'
					? 'succeeded'
					: eventType === 'checkout.refunded'
						? 'refunded'
						: eventType === 'checkout.disputed'
							? 'pending'
							: 'failed',
			metadata: payload as Json,
		});
	}

	private createCharge(installment: InstallmentRow, registration: RegistrationRow, eventTitle: string) {
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

	private async reserveInventory(ids: string[]) {
		try {
			await this.inventory.reserve(ids);
		} catch (error) {
			if (error instanceof TicketInventoryUnavailable)
				throw new ApiError(
					'O estoque mudou durante a compra. Revise a quantidade e tente novamente.',
					409,
					'INSUFFICIENT_STOCK',
				);
			throw error;
		}
	}

	private releaseInventory(ids: string[]) {
		return this.inventory.release(ids);
	}

	private async limit(scope: string, userId: string, limit: number) {
		try {
			await this.rateLimit.execute({ scope, subject: userId, limit, windowSeconds: 60 });
		} catch (error) {
			if (error instanceof RateLimitExceeded)
				throw new ApiError('Muitas tentativas. Aguarde um minuto e tente novamente.', 429, 'RATE_LIMITED');
			throw error;
		}
	}
}

function ticketCode() {
	return `EVT-${crypto.randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`;
}

function ticketSnapshot(ticket: TicketRow): CheckoutTicketSnapshot {
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

function checkoutRuleError(error: CheckoutRuleViolation) {
	if (error.rule === 'insufficient_stock') {
		return new ApiError(`Há somente ${error.details.available} ingresso(s) disponível(is).`, 409, 'INSUFFICIENT_STOCK');
	}
	const errors: Partial<Record<CheckoutRuleViolation['rule'], [string, string]>> = {
		duplicate_ticket: ['O mesmo tipo de ingresso foi selecionado mais de uma vez.', 'DUPLICATE_TICKET'],
		maximum_quantity: ['Quantidade acima do limite por compra.', 'PURCHASE_LIMIT'],
		minimum_quantity: ['Quantidade abaixo do mínimo por compra.', 'MINIMUM_PURCHASE'],
		registration_closed: ['As inscrições para este evento estão fechadas.', 'REGISTRATION_CLOSED'],
	};
	const [message, code] = errors[error.rule] ?? ['Ingresso indisponível.', 'TICKET_UNAVAILABLE'];
	return new ApiError(message, 422, code);
}

function money(value: number) {
	return Math.round(value * 100) / 100;
}

function readPaymentMethod(method: unknown) {
	const normalized = String(method ?? '').toLowerCase();
	if (normalized === 'card') return 'card';
	if (normalized === 'boleto') return 'boleto';
	return 'pix';
}

function movementFromData(data: PaymentWebhookPayload['data']): WebhookMovement | undefined {
	return data?.id
		? {
				id: data.id,
				externalId: data.externalId,
				reason: data.reason,
				receiptUrl: data.receiptUrl,
			}
		: undefined;
}
