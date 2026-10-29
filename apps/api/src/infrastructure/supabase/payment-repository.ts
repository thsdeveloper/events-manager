import type { Database } from '@events-manager/contracts';
import type {
	CheckoutEvent,
	InstallmentWithRegistration,
	PaymentRepository,
	RegistrationRow,
} from '../../application/payments/payment-service.js';
import type { PaymentProvider } from '../../application/payments/payment-gateway.js';
import type { SupabaseClients } from './clients.js';
import { isUuid } from './search.js';

type RegistrationInsert = Database['public']['Tables']['event_registrations']['Insert'];
type RegistrationUpdate = Database['public']['Tables']['event_registrations']['Update'];
type InstallmentInsert = Database['public']['Tables']['payment_installments']['Insert'];
type RegistrationTicketInsert = Database['public']['Tables']['registration_tickets']['Insert'];
type TransactionInsert = Database['public']['Tables']['payment_transactions']['Insert'];

export class SupabasePaymentRepository implements PaymentRepository {
	constructor(
		private readonly clients: SupabaseClients,
		private readonly provider: PaymentProvider = 'abacatepay',
	) {}

	async findCheckoutEvent(id: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('*,organizer_id:organizers(*),tickets:event_tickets(*)')
			.eq('id', id)
			.eq('status', 'published')
			.maybeSingle();
		if (error) throw error;
		return data as unknown as CheckoutEvent | null;
	}

	async getConfiguration() {
		const { data, error } = await this.clients.admin.from('event_configurations').select('*').eq('id', 1).single();
		if (error) throw error;
		return data;
	}

	async createRegistration(input: RegistrationInsert) {
		const { data, error } = await this.clients.admin.from('event_registrations').insert(input).select('*').single();
		if (error) throw error;
		return data;
	}

	async createRegistrationTickets(rows: RegistrationTicketInsert[]) {
		const { data, error } = await this.clients.admin.from('registration_tickets').insert(rows).select('*');
		if (error) throw error;
		return data ?? [];
	}

	async hasProcessedWebhook(eventId: string) {
		const { data, error } = await this.clients.admin
			.from('payment_webhook_events')
			.select('id')
			.eq('id', eventId)
			.maybeSingle();
		if (error) throw error;
		return data !== null;
	}

	async markWebhookProcessed(eventId: string, event: string) {
		const { error } = await this.clients.admin
			.from('payment_webhook_events')
			.upsert({ id: eventId, event }, { onConflict: 'id' });
		if (error) throw error;
	}

	/** Parcelas pagas com cobrança no provedor: cada uma é estornada em separado. */
	async listPaidInstallmentCharges(registrationId: string) {
		const { data, error } = await this.clients.admin
			.from('payment_installments')
			.select('amount,provider_transaction_id')
			.eq('registration_id', registrationId)
			.eq('status', 'paid')
			.not('provider_transaction_id', 'is', null)
			.order('installment_number');
		if (error) throw error;
		return (data ?? []).map((row) => ({ chargeId: String(row.provider_transaction_id), amount: Number(row.amount) }));
	}

	async findProviderProduct(ticketId: string, unitPriceCents: number) {
		const { data, error } = await this.clients.admin
			.from('ticket_provider_products')
			.select('provider_product_id')
			.eq('ticket_id', ticketId)
			.eq('provider', this.provider)
			.eq('unit_price_cents', unitPriceCents)
			.maybeSingle();
		if (error) throw error;
		return data?.provider_product_id ?? null;
	}

	async saveProviderProduct(ticketId: string, unitPriceCents: number, productId: string) {
		const { error } = await this.clients.admin.from('ticket_provider_products').upsert(
			{
				ticket_id: ticketId,
				provider: this.provider,
				unit_price_cents: unitPriceCents,
				provider_product_id: productId,
			},
			{ onConflict: 'ticket_id,provider,unit_price_cents' },
		);
		if (error) throw error;
	}

	async recordTransaction(input: TransactionInsert) {
		const { error } = await this.clients.admin
			.from('payment_transactions')
			.upsert(input, { onConflict: 'provider_event_id' });
		if (error) throw error;
	}

	async settleInstallmentWebhook(input: {
		chargeId: string;
		installmentId: string;
		metadata: Database['public']['Tables']['payment_transactions']['Insert']['metadata'];
		providerFee: number;
		registrationId: string;
	}) {
		const { error } = await this.clients.admin.rpc('settle_installment_webhook', {
			target_charge_id: input.chargeId,
			target_installment_id: input.installmentId,
			target_metadata: input.metadata ?? {},
			target_provider_fee: input.providerFee,
			target_registration_id: input.registrationId,
		});
		if (error) throw error;
	}

	async linkCheckout(registrationIds: string[], checkoutId: string) {
		const { error } = await this.clients.admin
			.from('event_registrations')
			.update({ provider_checkout_id: checkoutId })
			.in('id', registrationIds);
		if (error) throw error;
	}

	async cancelIncompleteCheckout(registrationIds: string[], reason: string) {
		const { error } = await this.clients.admin
			.from('event_registrations')
			.update({
				cancelled_at: new Date().toISOString(),
				cancelled_reason: reason,
				payment_method: null,
				payment_status: null,
				status: 'cancelled',
			})
			.in('id', registrationIds);
		if (error) throw error;
	}

	async findTicketForInstallments(id: string) {
		const { data, error } = await this.clients.admin
			.from('event_tickets')
			.select('*,event_id:events(*)')
			.eq('id', id)
			.maybeSingle();
		if (error) throw error;
		return data as unknown as
			| (Database['public']['Tables']['event_tickets']['Row'] & {
					event_id: Database['public']['Tables']['events']['Row'];
			  })
			| null;
	}

	async createInstallments(rows: InstallmentInsert[]) {
		const { data, error } = await this.clients.admin.from('payment_installments').insert(rows).select('*');
		if (error) throw error;
		return data ?? [];
	}

	async setInstallmentCharge(id: string, input: { providerId: string; qrCode: string | null; copyPaste: string }) {
		const { error } = await this.clients.admin
			.from('payment_installments')
			.update({
				provider_transaction_id: input.providerId,
				pix_qr_code_base64: input.qrCode,
				pix_copy_paste: input.copyPaste,
			})
			.eq('id', id);
		if (error) throw error;
	}

	async cancelInstallmentPlan(registrationId: string, reason: string) {
		const [installments, registration] = await Promise.all([
			this.clients.admin
				.from('payment_installments')
				.update({ status: 'cancelled' })
				.eq('registration_id', registrationId),
			this.clients.admin
				.from('event_registrations')
				.update({
					cancelled_at: new Date().toISOString(),
					cancelled_reason: reason,
					installment_plan_status: 'defaulted',
					payment_status: null,
					status: 'cancelled',
				})
				.eq('id', registrationId),
		]);
		if (installments.error) throw installments.error;
		if (registration.error) throw registration.error;
	}

	async findInstallmentForUser(id: string, userId: string) {
		const { data, error } = await this.clients.admin
			.from('payment_installments')
			.select('*,registration_id:event_registrations!inner(*,event_id:events(*))')
			.eq('id', id)
			.eq('registration_id.user_id', userId)
			.maybeSingle();
		if (error) throw error;
		return data as unknown as InstallmentWithRegistration | null;
	}

	async findInstallmentForWebhook(providerId: string, externalId?: string) {
		const providerResult = await this.clients.admin
			.from('payment_installments')
			.select('*,registration_id:event_registrations(*)')
			.eq('provider_transaction_id', providerId)
			.maybeSingle();
		if (providerResult.error) throw providerResult.error;
		if (providerResult.data || !externalId || !isUuid(externalId))
			return providerResult.data as unknown as InstallmentWithRegistration | null;
		const fallback = await this.clients.admin
			.from('payment_installments')
			.select('*,registration_id:event_registrations(*)')
			.eq('id', externalId)
			.maybeSingle();
		if (fallback.error) throw fallback.error;
		return fallback.data as unknown as InstallmentWithRegistration | null;
	}

	async cancelPendingInstallments(registrationId: string) {
		const { error } = await this.clients.admin
			.from('payment_installments')
			.update({ status: 'cancelled' })
			.eq('registration_id', registrationId)
			.neq('status', 'paid');
		if (error) throw error;
	}

	async updateRegistration(id: string, input: RegistrationUpdate) {
		const { error } = await this.clients.admin.from('event_registrations').update(input).eq('id', id);
		if (error) throw error;
	}

	async updatePayoutForWebhook(providerId: string, externalId: string | undefined, input: Record<string, unknown>) {
		const providerResult = await this.clients.admin
			.from('organizer_payouts')
			.update(input)
			.eq('provider_payout_id', providerId)
			.select('id');
		if (providerResult.error) throw providerResult.error;
		if (providerResult.data?.length || !externalId || !isUuid(externalId)) return;
		const fallback = await this.clients.admin.from('organizer_payouts').update(input).eq('id', externalId);
		if (fallback.error) throw fallback.error;
	}

	async findCheckoutRegistrations(checkoutId: string, externalId?: string) {
		let { data, error } = await this.clients.admin
			.from('event_registrations')
			.select('*')
			.eq('provider_checkout_id', checkoutId);
		if (error) throw error;
		if (!data?.length && externalId) {
			const fallback = await this.clients.admin
				.from('event_registrations')
				.select('*')
				.contains('additional_info', { checkout_group_id: externalId });
			if (fallback.error) throw fallback.error;
			data = fallback.data;
			if (data?.length)
				await this.linkCheckout(
					data.map((registration) => registration.id),
					checkoutId,
				);
		}
		return (data ?? []) as RegistrationRow[];
	}
}
