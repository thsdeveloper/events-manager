export class TicketInventoryUnavailable extends Error {
    constructor() {
        super('Ticket inventory unavailable');
        this.name = 'TicketInventoryUnavailable';
    }
}
export class ManageTicketInventory {
    inventory;
    constructor(inventory) {
        this.inventory = inventory;
    }
    async reserve(registrationIds) {
        await this.inventory.reserve(registrationIds);
    }
    async release(registrationIds) {
        await this.inventory.release(registrationIds);
    }
}
//# sourceMappingURL=manage-ticket-inventory.js.map