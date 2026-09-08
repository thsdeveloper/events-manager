import type { AppUser } from './domain.js';

export interface ProfileChecklistItem {
	id: 'name' | 'avatar' | 'birth_date' | 'document' | 'phone' | 'phone_verified' | 'location' | 'description';
	label: string;
	complete: boolean;
}

/**
 * O que significa "cadastro completo". A lista alimenta a porcentagem do perfil
 * no front e a regra da API que só deixa virar organizador com tudo preenchido,
 * então os dois lados sempre concordam sobre o que falta.
 */
export function getProfileChecklist(user: AppUser): ProfileChecklistItem[] {
	return [
		{ id: 'name', label: 'Nome e sobrenome', complete: Boolean(user.first_name && user.last_name) },
		{ id: 'avatar', label: 'Foto de perfil', complete: Boolean(user.avatar) },
		{ id: 'birth_date', label: 'Data de nascimento', complete: Boolean(user.birth_date) },
		{ id: 'document', label: 'CPF', complete: Boolean(user.document) },
		{ id: 'phone', label: 'Telefone', complete: Boolean(user.phone) },
		{ id: 'phone_verified', label: 'Telefone confirmado', complete: Boolean(user.phone && user.phone_verified_at) },
		{ id: 'location', label: 'Localização', complete: Boolean(user.location) },
		{ id: 'description', label: 'Sobre você', complete: Boolean(user.description) },
	];
}

export function getProfileCompletion(user: AppUser) {
	const items = getProfileChecklist(user);
	const completed = items.filter((item) => item.complete).length;

	return Math.round((completed / items.length) * 100);
}

export function isProfileComplete(user: AppUser) {
	return getProfileChecklist(user).every((item) => item.complete);
}
