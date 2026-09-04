import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { ProfileNavigation } from './ProfileNavigation';
import type { ProfileUser } from './types';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('./ProfileAvatarUpload', () => ({ ProfileAvatarUpload: () => <div>avatar</div> }));

const user: ProfileUser = {
	id: 'u1',
	email: 'ana@example.com',
	first_name: 'Ana',
	last_name: 'Silva',
	avatar: null,
	description: null,
	city_id: null,
	location: null,
	birth_date: '1990-05-20',
	document: null,
};

function renderNavigation(completion: number) {
	return renderWithProviders(
		<ProfileNavigation
			user={user}
			avatarUrl=""
			completion={completion}
			activeSection="overview"
			onSectionChange={vi.fn()}
			onLogout={vi.fn()}
			onProfileUpdated={vi.fn()}
		/>,
	);
}

describe('ProfileNavigation', () => {
	it('shows how complete the profile is while something is missing', () => {
		renderNavigation(57);

		expect(screen.getByRole('progressbar', { name: 'Perfil completo' })).toHaveAttribute('aria-valuenow', '57');
		expect(screen.getByText('57%')).toBeInTheDocument();
	});

	it('drops the completion meter once the profile is complete', () => {
		renderNavigation(100);

		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		expect(screen.queryByText('Perfil completo')).not.toBeInTheDocument();
		expect(screen.queryByText('100%')).not.toBeInTheDocument();
	});
});
