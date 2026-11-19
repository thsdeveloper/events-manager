import type { SupabaseClient } from '@supabase/supabase-js';
import type {
	TransparentAttempt,
	TransparentAttemptRepository,
} from '../../application/payments/transparent-checkout-service.js';
import type { TransparentCharge } from '../../application/payments/payment-gateway.js';
import { ApiError } from '../../shared/errors.js';
export class SupabaseTransparentAttemptRepository implements TransparentAttemptRepository {
	constructor(private readonly db: SupabaseClient) {}
	async claim(input: Parameters<TransparentAttemptRepository['claim']>[0]) {
		const { data, error } = await this.db
			.from('checkout_attempts')
			.upsert(input, { onConflict: 'id', ignoreDuplicates: true })
			.select('*')
			.maybeSingle();
		if (error) throw error;
		if (data) return { created: true, attempt: data as TransparentAttempt };
		const existing = await this.find(input.id, input.user_id);
		if (!existing) throw new ApiError('Compra não encontrada.', 404, 'CHECKOUT_NOT_FOUND');
		return { created: false, attempt: existing };
	}
	async find(id: string, userId: string) {
		const { data, error } = await this.db
			.from('checkout_attempts')
			.select('*')
			.eq('id', id)
			.eq('user_id', userId)
			.maybeSingle();
		if (error) throw error;
		return data as TransparentAttempt | null;
	}
	async findForProvider(providerId: string, attemptId?: string) {
		let query = this.db.from('checkout_attempts').select('*');
		if (attemptId && /^[0-9a-f-]{36}$/i.test(attemptId)) query = query.eq('id', attemptId);
		else query = query.eq('provider_id', providerId);
		const { data, error } = await query.maybeSingle();
		if (error) throw error;
		return data as TransparentAttempt | null;
	}
	async prepare(id: string, input: Parameters<TransparentAttemptRepository['prepare']>[1]) {
		const { error } = await this.db.rpc('prepare_transparent_checkout', {
			target_attempt: id,
			target_registrations: input.registrationIds,
			target_amount: input.amountInCents,
		});
		if (error) throw error;
	}
	async saveResult(id: string, input: Parameters<TransparentAttemptRepository['saveResult']>[1]) {
		const { error } = await this.db
			.from('checkout_attempts')
			.update({
				...(input.payment ? { charge: input.payment, provider_id: input.payment.id } : {}),
				...(input.confirmationUrl ? { confirmation_url: input.confirmationUrl } : {}),
				...(input.confirmed
					? { status: 'confirmed', fee_confirmed: true, registration_ids: [input.registrationId] }
					: {}),
				updated_at: new Date().toISOString(),
			})
			.eq('id', id);
		if (error) throw error;
	}
	async fail(id: string, message: string) {
		const { error } = await this.db
			.from('checkout_attempts')
			.update({ status: 'failed', error_message: message, updated_at: new Date().toISOString() })
			.eq('id', id)
			.eq('status', 'processing');
		if (error) throw error;
	}
	async settle(id: string, charge: TransparentCharge, event?: string) {
		const { error } = await this.db.rpc('settle_transparent_checkout', {
			target_attempt: id,
			target_charge: charge,
			target_event: event ?? null,
		});
		if (error) throw error;
	}
	async pending(limit: number) {
		const { data, error } = await this.db
			.from('checkout_attempts')
			.select('*')
			.is('charge->>developmentSimulation', null)
			.or(
				'status.in.(processing,pending,disputed),and(status.eq.confirmed,fee_confirmed.eq.false),and(status.eq.confirmed,charge->>status.eq.APPROVED)',
			)
			.lt('updated_at', new Date(Date.now() - 30000).toISOString())
			.order('updated_at')
			.limit(limit);
		if (error) throw error;
		if (data?.length) {
			const claimed = await this.db
				.from('checkout_attempts')
				.update({ updated_at: new Date().toISOString() })
				.in(
					'id',
					data.map((row) => row.id),
				);
			if (claimed.error) throw claimed.error;
		}
		return (data ?? []) as TransparentAttempt[];
	}
}
