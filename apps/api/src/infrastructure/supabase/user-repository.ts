import type { UserRepository } from '../../application/users/user-service.js';
import type { SupabaseClients } from './clients.js';

export class SupabaseUserRepository implements UserRepository {
	constructor(private readonly clients: SupabaseClients) {}

	async listTickets(userId: string) {
		const { data, error } = await this.clients.admin
			.from('event_registrations')
			.select(
				'*,event_id:events(*,cover_image:media_files(*),category_id:event_categories(*)),ticket_type_id:event_tickets(*)',
			)
			.eq('user_id', userId)
			.in('payment_status', ['paid', 'free'])
			.order('date_created', { ascending: false });
		if (error) throw error;
		return data ?? [];
	}

	async listTransactions(userId: string) {
		const { data: registrations, error: registrationsError } = await this.clients.admin
			.from('event_registrations')
			.select('id')
			.eq('user_id', userId);
		if (registrationsError) throw registrationsError;
		const ids = (registrations ?? []).map((registration) => registration.id);
		if (!ids.length) return [];
		const { data, error } = await this.clients.admin
			.from('payment_transactions')
			.select('*,registration_id:event_registrations(*,event_id:events(*,cover_image:media_files(*)))')
			.in('registration_id', ids)
			.order('date_created', { ascending: false });
		if (error) throw error;
		return data ?? [];
	}

	async listPendingInstallmentRegistrations(userId: string) {
		const { data, error } = await this.clients.admin
			.from('event_registrations')
			.select('*,event_id:events(*),ticket_type_id:event_tickets(*),installments:payment_installments(*)')
			.eq('user_id', userId)
			.eq('is_installment_payment', true)
			.in('installment_plan_status', ['active', 'defaulted'])
			.order('date_created', { ascending: false });
		if (error) throw error;
		return (data ?? []) as unknown as Record<string, unknown>[];
	}
}
