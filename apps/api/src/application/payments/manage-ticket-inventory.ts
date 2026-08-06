export interface TicketInventoryRepository {
	reserve(registrationIds: string[]): Promise<void>;
	release(registrationIds: string[]): Promise<void>;
}

export class TicketInventoryUnavailable extends Error {
	constructor() {
		super('Ticket inventory unavailable');
		this.name = 'TicketInventoryUnavailable';
	}
}

export class ManageTicketInventory {
	constructor(private readonly inventory: TicketInventoryRepository) {}

	async reserve(registrationIds: string[]) {
		await this.inventory.reserve(registrationIds);
	}

	async release(registrationIds: string[]) {
		await this.inventory.release(registrationIds);
	}
}
