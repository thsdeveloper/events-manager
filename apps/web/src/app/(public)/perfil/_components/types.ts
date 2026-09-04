import type { AppUser, EventRegistration } from '@events-manager/contracts';
import type { ProfileSection } from '@/lib/profile-sections';

export type ProfileUser = AppUser & { email: string };

/**
 * Doubles as the `?section=` value. `ingressos` keeps the pt-BR naming the
 * public routes already use, and replaces the standalone `/meus-ingressos` page.
 * Defined in `@/lib/profile-sections` so the header avatar menu can link to the
 * same set without reaching into this route's private folder.
 */
export type { ProfileSection } from '@/lib/profile-sections';

export interface ProfileFormValues {
	firstName: string;
	lastName: string;
	email: string;
	/** AAAA-MM-DD; a idade mínima é validada pelo contrato compartilhado. */
	birthDate: string;
	/** CPF só com dígitos; a máscara é apresentação. */
	document: string;
	/** Telefone com DDD, só dígitos; a máscara é apresentação. */
	phone: string;
	/** Código IBGE do município. O rótulo exibido é derivado no servidor. */
	cityId: number | null;
	description: string;
}

export interface ProfilePreferences {
	eventReminders: boolean;
	purchaseUpdates: boolean;
	recommendations: boolean;
	marketing: boolean;
	timezone: string;
}

export interface TicketSummary {
	registrations: EventRegistration[];
	isLoading: boolean;
	hasError: boolean;
}

// Re-exported so existing profile imports keep their single entry point while
// the header avatar menu shares the same implementation.
export { getDisplayName, getInitials } from '@/lib/user-display';

export interface ProfileChecklistItem {
	id: string;
	label: string;
	complete: boolean;
	/** Where the item is filled in. */
	section: ProfileSection;
}

/**
 * Single source of truth for "how complete is the profile": the card lists
 * these items and the percentage counts them, so both always agree.
 */
export function getProfileChecklist(user: ProfileUser): ProfileChecklistItem[] {
	return [
		{ id: 'name', label: 'Nome e sobrenome', complete: Boolean(user.first_name && user.last_name), section: 'personal' },
		{ id: 'avatar', label: 'Foto de perfil', complete: Boolean(user.avatar), section: 'overview' },
		{ id: 'birth_date', label: 'Data de nascimento', complete: Boolean(user.birth_date), section: 'personal' },
		{ id: 'document', label: 'CPF', complete: Boolean(user.document), section: 'personal' },
		{ id: 'phone', label: 'Telefone', complete: Boolean(user.phone), section: 'personal' },
		{
			id: 'phone_verified',
			label: 'Telefone confirmado',
			complete: Boolean(user.phone && user.phone_verified_at),
			section: 'personal',
		},
		{ id: 'location', label: 'Localização', complete: Boolean(user.location), section: 'personal' },
		{ id: 'description', label: 'Sobre você', complete: Boolean(user.description), section: 'personal' },
	];
}

export function getProfileCompletion(user: ProfileUser) {
	const items = getProfileChecklist(user);
	const completed = items.filter((item) => item.complete).length;

	return Math.round((completed / items.length) * 100);
}
