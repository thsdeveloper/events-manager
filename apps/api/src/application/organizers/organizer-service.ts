import type { OrganizerSignupInput } from '@events-manager/contracts';
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
	/** Uma pessoa tem no máximo uma conta de organizador, em qualquer status. */
	existsForUser(userId: string): Promise<boolean>;
	findByDocument(document: string): Promise<{ id: string; user_id: string } | null>;
	findById(organizerId: string): Promise<unknown | null>;
	setLogo(organizerId: string, mediaId: string): Promise<unknown>;
	stats(organizerId: string): Promise<OrganizerStats>;
	updateById(organizerId: string, input: Partial<OrganizerInput>): Promise<unknown | null>;
	updatePayout(
		organizerId: string,
		input: { payout_pix_key: string; payout_pix_key_type: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM' },
	): Promise<unknown>;
}

export class OrganizerService {
	constructor(private readonly repository: OrganizerRepository) {}

	getProfile(organizerId: string) {
		return this.repository.findById(organizerId);
	}

	/**
	 * Regras do cadastro: uma conta de organizador por pessoa; quem vende como
	 * pessoa física usa o CPF já validado no perfil (o cliente não escolhe o
	 * documento); quem vende como empresa informa um CNPJ que ainda não pertence
	 * a outra organização.
	 */
	async create(
		userId: string,
		input: OrganizerSignupInput,
		initialStatus: 'active' | 'pending',
		context: { profileDocument: string | null },
	) {
		if (await this.repository.existsForUser(userId)) {
			throw new ApiError('Você já possui uma conta de organizador.', 409, 'ORGANIZER_EXISTS');
		}

		let document: string;
		if (input.account_type === 'individual') {
			if (!context.profileDocument) {
				throw new ApiError('Cadastre e valide seu CPF no perfil antes de continuar.', 422, 'PROFILE_DOCUMENT_REQUIRED');
			}
			document = context.profileDocument;
		} else {
			const owner = await this.repository.findByDocument(input.document);
			if (owner) throw new ApiError('Este CNPJ já está vinculado a outra organização.', 409, 'DOCUMENT_IN_USE');
			document = input.document;
		}

		const organizer = await this.repository.create(
			userId,
			normalizeWebsite({
				name: input.name,
				email: input.email,
				phone: input.phone,
				description: input.description ?? null,
				website: input.website ?? null,
				document,
			}),
			initialStatus,
		);
		if (organizer === 'exists') {
			throw new ApiError('Você já possui uma conta de organizador.', 409, 'ORGANIZER_EXISTS');
		}
		return organizer;
	}

	async update(organizerId: string, input: Partial<OrganizerInput>) {
		const organizer = await this.repository.updateById(organizerId, normalizeWebsite(input));
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
