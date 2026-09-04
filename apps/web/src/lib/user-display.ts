/**
 * Display helpers shared by every surface that shows the signed-in user — the
 * profile sidebar and the header avatar menu. They live here rather than in the
 * profile route's private `_components` folder so the header does not have to
 * reach across that boundary and drift into a second implementation.
 */
export interface DisplayableUser {
	email?: string | null;
	first_name?: string | null;
	last_name?: string | null;
}

export function getDisplayName(user: DisplayableUser) {
	const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ').trim();

	return fullName || user.email?.split('@')[0] || 'Participante';
}

export function getInitials(user: DisplayableUser) {
	const source = getDisplayName(user);
	const parts = source.split(/\s+/).filter(Boolean);

	return parts
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join('');
}
