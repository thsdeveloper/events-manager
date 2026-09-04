import type { AppUser, EventRegistration } from '@events-manager/contracts';

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

export function getProfileCompletion(user: ProfileUser) {
	const fields = [
		user.first_name,
		user.last_name,
		user.email,
		user.avatar,
		user.document,
		user.location,
		user.description,
	];
	const completed = fields.filter(Boolean).length;

	return Math.round((completed / fields.length) * 100);
}
