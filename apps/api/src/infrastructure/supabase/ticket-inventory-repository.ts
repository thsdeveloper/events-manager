import type { Database } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	TicketInventoryUnavailable,
	type TicketInventoryRepository,
} from '../../application/payments/manage-ticket-inventory.js';

export class SupabaseTicketInventoryRepository implements TicketInventoryRepository {
	constructor(private readonly database: SupabaseClient<Database>) {}

	async reserve(registrationIds: string[]) {
		const { error } = await this.database.rpc('reserve_registration_inventory', {
			target_registrations: registrationIds,
		});

		if (!error) return;
		if (error.message.toLowerCase().includes('ticket inventory unavailable')) {
			throw new TicketInventoryUnavailable();
		}
		throw error;
	}

	async release(registrationIds: string[]) {
		const { error } = await this.database.rpc('release_registration_inventory', {
			target_registrations: registrationIds,
		});
		if (error) throw error;
	}
}
