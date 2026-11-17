import type { CouponInput, CouponPatch } from '@events-manager/contracts';
import type { Coupon, CouponRepository, TicketPrice } from '../../application/coupons/coupon-service.js';
import type { SupabaseClients } from './clients.js';

const couponSelection =
	'id,event_id,code,description,discount_type,discount_value,status,starts_at,expires_at,max_uses,uses,date_created,date_updated';

export class SupabaseCouponRepository implements CouponRepository {
	constructor(private readonly clients: SupabaseClients) {}

	/** Só o cupom ativo entra na validação; o inativo se comporta como inexistente. */
	async findActiveByCode(eventId: string, code: string) {
		const { data, error } = await this.clients.admin
			.from('event_coupons')
			.select(couponSelection)
			.eq('event_id', eventId)
			.eq('code', code)
			.eq('status', 'active')
			.maybeSingle();
		if (error) throw error;

		return (data ?? null) as Coupon | null;
	}

	async getFeeConfiguration() {
		const { data, error } = await this.clients.admin
			.from('event_configurations')
			.select('platform_fee_percentage,platform_fee_minimum')
			.eq('id', 1)
			.single();
		if (error) throw error;
		return {
			platform_fee_percentage: Number(data?.platform_fee_percentage ?? 0),
			platform_fee_minimum: Number(data?.platform_fee_minimum ?? 0),
		};
	}
	async findTicketPrices(eventId: string, ticketIds: string[]) {
		const { data, error } = await this.clients.admin
			.from('event_tickets')
			.select('id,buyer_price,price,service_fee_type')
			.eq('event_id', eventId)
			.in('id', ticketIds);
		if (error) throw error;

		return (data ?? []) as unknown as TicketPrice[];
	}

	async ownsEvent(userId: string, eventId: string) {
		const { data, error } = await this.clients.admin
			.from('events')
			.select('id,organizer_id:organizers!inner(user_id)')
			.eq('id', eventId)
			.eq('organizers.user_id', userId)
			.maybeSingle();
		if (error) throw error;

		return data !== null;
	}

	async listByEvent(eventId: string) {
		const { data, error } = await this.clients.admin
			.from('event_coupons')
			.select(couponSelection)
			.eq('event_id', eventId)
			.order('date_created', { ascending: false });
		if (error) throw error;

		return (data ?? []) as unknown as Coupon[];
	}

	async createForEvent(eventId: string, input: CouponInput) {
		const { data, error } = await this.clients.admin
			.from('event_coupons')
			.insert({ ...input, event_id: eventId })
			.select(couponSelection)
			.single();
		if (error) throw error;

		return data as unknown as Coupon;
	}

	async updateForEvent(eventId: string, couponId: string, input: CouponPatch) {
		const { data, error } = await this.clients.admin
			.from('event_coupons')
			.update({ ...input, date_updated: new Date().toISOString() })
			.eq('id', couponId)
			.eq('event_id', eventId)
			.select(couponSelection)
			.maybeSingle();
		if (error) throw error;

		return (data ?? null) as Coupon | null;
	}

	async deleteForEvent(eventId: string, couponId: string) {
		const { data, error } = await this.clients.admin
			.from('event_coupons')
			.delete()
			.eq('id', couponId)
			.eq('event_id', eventId)
			.select('id')
			.maybeSingle();
		if (error) throw error;

		return data !== null;
	}
}
