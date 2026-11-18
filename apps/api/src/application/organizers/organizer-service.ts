import type { OrganizerSignupInput } from '@events-manager/contracts';
import type { MediaRepository } from '../media/media-service.js';
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

/** O que a API lê do perfil validado para abrir a conta de uma pessoa física. */
export interface OrganizerSignupProfile {
	document: string | null;
	email: string | null;
	first_name: string | null;
	last_name: string | null;
	phone: string | null;
}

function detailsFromProfile(profile: OrganizerSignupProfile) {
	if (!profile.document) {
		throw new ApiError('Cadastre e valide seu CPF no perfil antes de continuar.', 422, 'PROFILE_DOCUMENT_REQUIRED');
	}
	if (!profile.first_name || !profile.last_name || !profile.email || !profile.phone) {
		throw new ApiError('Complete nome, e-mail e telefone no seu perfil antes de continuar.', 422, 'PROFILE_INCOMPLETE');
	}

	return {
		name: `${profile.first_name} ${profile.last_name}`,
		email: profile.email,
		phone: profile.phone,
		document: profile.document,
	};
}

export interface OrganizerStats {
	totalEvents: number;
	totalRegistrations: number;
	totalRevenue: number;
}

export interface OrganizerRepository {
	create(
		userId: string,
		input: OrganizerInput,
		status: 'active' | 'pending',
	): Promise<{ id: string; status: string } | 'exists'>;
	findByDocument(document: string): Promise<{ id: string; user_id: string } | null>;
	findById(organizerId: string): Promise<unknown | null>;
	setLogo(organizerId: string, mediaId: string | null): Promise<unknown>;
	stats(organizerId: string, eventId?: string): Promise<OrganizerStats>;
	updateById(organizerId: string, input: Partial<OrganizerInput>): Promise<unknown | null>;
	updatePayout(
		organizerId: string,
		input: { payout_pix_key: string; payout_pix_key_type: 'CPF' | 'CNPJ' | 'PHONE' | 'EMAIL' | 'RANDOM' },
	): Promise<unknown>;
}

export class OrganizerService {
	constructor(
		private readonly repository: OrganizerRepository,
		private readonly media?: Pick<MediaRepository, 'removeOwnedFile'>,
	) {}

	getProfile(organizerId: string) {
		return this.repository.findById(organizerId);
	}

	/** Uma pessoa pode gerenciar várias organizações, cada uma com seu CPF/CNPJ. */
	async create(
		userId: string,
		input: OrganizerSignupInput,
		initialStatus: 'active' | 'pending',
		context: { profile: OrganizerSignupProfile },
	) {
		const details = input.account_type === 'individual' ? detailsFromProfile(context.profile) : input;
		const duplicateMessage =
			input.account_type === 'individual'
				? 'Você já possui uma conta com este CPF. Cadastre uma empresa com outro CNPJ.'
				: 'Este CNPJ já está vinculado a uma organização.';
		if (await this.repository.findByDocument(details.document)) {
			throw new ApiError(duplicateMessage, 409, 'DOCUMENT_IN_USE');
		}

		const organizer = await this.repository.create(
			userId,
			normalizeWebsite({
				name: details.name,
				email: details.email,
				phone: details.phone,
				document: details.document,
				description: input.description ?? null,
				website: input.website ?? null,
			}),
			initialStatus,
		);
		if (organizer === 'exists') {
			throw new ApiError(duplicateMessage, 409, 'DOCUMENT_IN_USE');
		}
		return organizer;
	}

	async update(organizerId: string, input: Partial<OrganizerInput>) {
		if (input.document !== undefined) {
			const existing = (await this.repository.findById(organizerId)) as {
				document?: string | null;
				current_receiving_request_id?: string | null;
			} | null;
			if (existing?.current_receiving_request_id && input.document !== existing.document)
				throw new ApiError(
					'O CPF/CNPJ não pode ser alterado após o envio dos documentos de recebimento.',
					409,
					'VERIFIED_DOCUMENT_IMMUTABLE',
				);
		}
		const organizer = await this.repository.updateById(organizerId, normalizeWebsite(input));
		if (!organizer) throw new ApiError('Perfil de organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
		return organizer;
	}

	async setLogo(organizerId: string, mediaId: string | null, ownerId: string) {
		const profile = (await this.repository.findById(organizerId)) as { logo?: string | { id: string } | null } | null;
		if (!profile) throw new ApiError('Perfil de organizador não encontrado.', 404, 'ORGANIZER_NOT_FOUND');
		const previous = typeof profile.logo === 'string' ? profile.logo : profile.logo?.id;
		let organizer: unknown;
		try {
			organizer = await this.repository.setLogo(organizerId, mediaId);
		} catch (error) {
			// A failed replacement must preserve the existing image. Only the new orphan is removed.
			if (mediaId && mediaId !== previous) await this.media?.removeOwnedFile(mediaId, ownerId).catch(() => undefined);
			throw error;
		}
		let cleanupPending = false;
		if (previous && previous !== mediaId && this.media) {
			try {
				cleanupPending = !(await this.media.removeOwnedFile(previous, ownerId));
			} catch {
				cleanupPending = true;
			}
		}
		return { organizer, cleanupPending };
	}

	stats(organizerId: string, eventId?: string) {
		return this.repository.stats(organizerId, eventId);
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
