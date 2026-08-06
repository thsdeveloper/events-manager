import { ApiError } from '../../shared/errors.js';

export interface OrganizerInput {
	description?: string | null;
	document?: string | null;
	email: string;
	logo?: string;
	name?: string;
	phone?: string | null;
	website?: string | null;
}

export interface OrganizerStats {
	totalEvents: number;
	totalRegistrations: number;
	totalRevenue: number;
}

export interface OrganizerRepository {
	create(userId: string, input: OrganizerInput, status: 'active' | 'pending'): Promise<unknown | 'exists'>;
	findByUser(userId: string): Promise<unknown | null>;
	setLogo(organizerId: string, mediaId: string): Promise<unknown>;
	stats(organizerId: string): Promise<OrganizerStats>;
	updateByUser(userId: string, input: Partial<OrganizerInput>): Promise<unknown | null>;
	updatePayout(
		organizerId: string,
		input: { payout_pix_key: string; payout_pix_key_type: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM' },
	): Promise<unknown>;
}

export class OrganizerService {
	constructor(private readonly repository: OrganizerRepository) {}

	getProfile(userId: string) {
		return this.repository.findByUser(userId);
	}

	async create(userId: string, input: OrganizerInput, initialStatus: 'active' | 'pending') {
		const organizer = await this.repository.create(userId, normalizeWebsite(input), initialStatus);
		if (organizer === 'exists') {
			throw new ApiError('Já existe uma solicitação ou perfil para este usuário.', 409, 'ORGANIZER_EXISTS');
		}
		return organizer;
	}

	async update(userId: string, input: Partial<OrganizerInput>) {
		const organizer = await this.repository.updateByUser(userId, normalizeWebsite(input));
		if (!organizer) throw new ApiError('Perfil de organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
		return organizer;
	}

	setLogo(organizerId: string, mediaId: string) {
		return this.repository.setLogo(organizerId, mediaId);
	}

	stats(organizerId: string) {
		return this.repository.stats(organizerId);
	}

	updatePayout(
		organizerId: string,
		input: { payout_pix_key: string; payout_pix_key_type: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM' },
	) {
		return this.repository.updatePayout(organizerId, input);
	}
}

function normalizeWebsite<T extends Partial<OrganizerInput>>(input: T): T {
	return { ...input, ...(input.website !== undefined ? { website: input.website || null } : {}) };
}
