import type { AppUser, EventRegistration } from '@events-manager/contracts';

export type ProfileUser = AppUser & { email: string };

export type ProfileSection = 'overview' | 'personal' | 'security' | 'preferences' | 'payments';

export interface ProfileFormValues {
	firstName: string;
	lastName: string;
	email: string;
	title: string;
	location: string;
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

export function getDisplayName(user: ProfileUser) {
	const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

	return fullName || user.email.split('@')[0] || 'Participante';
}

export function getInitials(user: ProfileUser) {
	const source = getDisplayName(user);
	const parts = source.split(/\s+/).filter(Boolean);

	return parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}

export function getProfileCompletion(user: ProfileUser) {
	const fields = [
		user.first_name,
		user.last_name,
		user.email,
		user.avatar,
		user.title,
		user.location,
		user.description,
	];
	const completed = fields.filter(Boolean).length;

	return Math.round((completed / fields.length) * 100);
}
