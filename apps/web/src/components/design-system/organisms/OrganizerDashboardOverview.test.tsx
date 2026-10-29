import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { OrganizerDashboardOverview } from './OrganizerDashboardOverview';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const emptyDashboard = {
	metrics: { totalEvents: 0, publishedEvents: 0, upcomingEvents: 0, participants: 0, ticketsSold: 0, grossRevenue: 0 },
	recentEvents: [],
};

describe('OrganizerDashboardOverview', () => {
	it('invites the organizer to create the first event, with an illustration, when there are none', () => {
		const { container } = renderWithProviders(<OrganizerDashboardOverview dashboard={emptyDashboard} />);

		expect(screen.getByRole('heading', { name: 'Sua agenda começa aqui' })).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Criar primeiro evento' })).toHaveAttribute('href', '/admin/eventos/novo');
		expect(container.querySelector('img[aria-hidden="true"]')).toHaveAttribute('src', '/images/empty/overview.svg');
	});
});
