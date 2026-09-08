import {
	getProfileChecklist as getSharedProfileChecklist,
	getProfileCompletion as getSharedProfileCompletion,
	type AppUser,
	type EventRegistration,
	type ProfileChecklistItem as SharedProfileChecklistItem,
} from '@events-manager/contracts';
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

export interface ProfileChecklistItem extends SharedProfileChecklistItem {
	/** Where the item is filled in. */
	section: ProfileSection;
}

/** The photo is changed from the sidebar avatar (overview); everything else in "Dados pessoais". */
const sectionByItem: Record<SharedProfileChecklistItem['id'], ProfileSection> = {
	name: 'personal',
	avatar: 'overview',
	birth_date: 'personal',
	document: 'personal',
	phone: 'personal',
	phone_verified: 'personal',
	location: 'personal',
	description: 'personal',
};

/**
 * The shared checklist from `@events-manager/contracts` (the same rule the API
 * enforces before someone becomes an organizer), plus where each item lives.
 */
export function getProfileChecklist(user: ProfileUser): ProfileChecklistItem[] {
	return getSharedProfileChecklist(user).map((item) => ({ ...item, section: sectionByItem[item.id] }));
}

export function getProfileCompletion(user: ProfileUser) {
	return getSharedProfileCompletion(user);
}
