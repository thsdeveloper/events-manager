import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { ProfilePageClient } from './ProfilePageClient';
import type { ProfileUser } from './types';

vi.mock('next/navigation', () => ({
	usePathname: () => '/perfil',
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));

const updateUser = vi.fn();
const refresh = vi.fn().mockResolvedValue(undefined);
vi.mock('@/hooks/useServerAuth', () => ({
	useServerAuth: () => ({ user: null, isLoading: false, isOrganizer: true, logout: vi.fn(), refresh, updateUser }),
}));

// The section panels are not under test; each is replaced by a marker.
vi.mock('./ProfileOverview', () => ({
	ProfileOverview: ({ isOrganizer }: { isOrganizer?: boolean }) => (
		<div>overview{isOrganizer ? ' (organizador)' : ''}</div>
	),
}));
vi.mock('./ProfileDetailsForm', () => ({ ProfileDetailsForm: () => <div>details</div> }));
vi.mock('./ProfileSecurity', () => ({ ProfileSecurity: () => <div>security</div> }));
vi.mock('./ProfilePreferences', () => ({ ProfilePreferences: () => <div>preferences</div> }));
vi.mock('@/components/account/TransactionHistory', () => ({ TransactionHistory: () => <div>payments</div> }));
vi.mock('@/components/tickets/MyTicketsContent', () => ({ MyTicketsContent: () => <div>tickets</div> }));
vi.mock('./ProfileNavigation', () => ({
	ProfileNavigation: ({
		onProfileUpdated,
		user,
	}: {
		onProfileUpdated: (user: ProfileUser) => void;
		user: ProfileUser;
	}) => (
		<button type="button" onClick={() => onProfileUpdated({ ...user, avatar: 'media-2' })}>
			simular nova foto
		</button>
	),
}));

const initialUser: ProfileUser = {
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

describe('ProfilePageClient', () => {
	it('tells the overview whether the person already organizes events', () => {
		mockFetchTickets();
		renderWithProviders(<ProfilePageClient initialUser={initialUser} />);

		expect(screen.getByText('overview (organizador)')).toBeInTheDocument();
	});

	it('pushes a new profile photo to the shared session so the header shows it at once', async () => {
		mockFetchTickets();
		const { user } = renderWithProviders(<ProfilePageClient initialUser={initialUser} />);

		await user.click(screen.getByRole('button', { name: /simular nova foto/i }));

		expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ id: 'u1', avatar: 'media-2' }));
	});
});

function mockFetchTickets() {
	vi.stubGlobal(
		'fetch',
		vi.fn(
			async () => new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
		),
	);
}
