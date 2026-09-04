/**
 * The sections of `/perfil` and the query string that selects them. Shared so
 * that every entry point — the profile sidebar, the overview shortcuts and the
 * header avatar menu — links to a section the page actually knows how to render,
 * checked at compile time.
 */
export type ProfileSection = 'overview' | 'personal' | 'security' | 'preferences' | 'payments' | 'ingressos';

export const profileSections: ProfileSection[] = [
	'overview',
	'personal',
	'security',
	'preferences',
	'payments',
	'ingressos',
];

export function profileSectionHref(section: ProfileSection) {
	return `/perfil?section=${section}`;
}
