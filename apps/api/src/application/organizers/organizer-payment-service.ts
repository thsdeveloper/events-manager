import {
	paymentAvailability,
	readOrganizerPayments,
	type OrganizerPaymentSettings,
	type CardSettlementPeriod,
} from '@events-manager/contracts';
import { ApiError } from '../../shared/errors.js';

export interface OrganizerPaymentRepository {
	findById(id: string): Promise<unknown | null>;
	updatePaymentSettings(id: string, input: OrganizerPaymentSettings): Promise<unknown | null>;
	getPaymentPeriod(): Promise<CardSettlementPeriod>;
}

export class OrganizerPaymentService {
	constructor(
		private readonly repository: OrganizerPaymentRepository,
		private readonly storeMethods: string[],
	) {}
	async get(id: string) {
		const [organizer, period] = await Promise.all([this.repository.findById(id), this.repository.getPaymentPeriod()]);
		return this.present(organizer, period);
	}
	async update(id: string, input: OrganizerPaymentSettings) {
		const [organizer, period] = await Promise.all([
			this.repository.updatePaymentSettings(id, input),
			this.repository.getPaymentPeriod(),
		]);
		return this.present(organizer, period);
	}
	private present(organizer: unknown, period: CardSettlementPeriod) {
		if (!organizer) throw new ApiError('Organização não encontrada.', 404, 'ORGANIZER_NOT_FOUND');
		const settings = readOrganizerPayments(organizer);
		return {
			settings,
			gateway_card_settlement_period: period,
			...paymentAvailability(settings, this.storeMethods, period),
		};
	}
}
