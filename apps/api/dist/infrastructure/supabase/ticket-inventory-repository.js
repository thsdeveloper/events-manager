import { TicketInventoryUnavailable, } from '../../application/payments/manage-ticket-inventory.js';
export class SupabaseTicketInventoryRepository {
    database;
    constructor(database) {
        this.database = database;
    }
    async reserve(registrationIds) {
        const { error } = await this.database.rpc('reserve_registration_inventory', {
            target_registrations: registrationIds,
        });
        if (!error)
            return;
        if (error.message.toLowerCase().includes('ticket inventory unavailable')) {
            throw new TicketInventoryUnavailable();
        }
        throw error;
    }
    async release(registrationIds) {
        const { error } = await this.database.rpc('release_registration_inventory', {
            target_registrations: registrationIds,
        });
        if (error)
            throw error;
    }
}
//# sourceMappingURL=ticket-inventory-repository.js.map