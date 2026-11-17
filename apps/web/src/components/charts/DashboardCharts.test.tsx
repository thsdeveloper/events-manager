import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { OrganizerDashboardCharts } from '@/components/design-system/organisms/OrganizerDashboardCharts';
import { PlatformOverviewCharts } from '@/features/super-admin/components/PlatformOverviewCharts';
describe('dashboard charts', () => {
	it('compares only recent events and uses platform totals for publication distribution', async () => {
		const { user } = renderWithProviders(
			<OrganizerDashboardCharts
				dashboard={{
					metrics: {
						totalEvents: 12,
						publishedEvents: 8,
						upcomingEvents: 4,
						participants: 300,
						ticketsSold: 250,
						grossRevenue: 5000,
					},
					recentEvents: [
						{
							id: 'a',
							title: 'Festival',
							slug: 'festival',
							status: 'published',
							startDate: '2026-12-20T18:00:00Z',
							location: 'São Paulo',
							participantCount: 30,
							ticketsSold: 20,
						},
					],
				}}
			/>,
		);
		expect(screen.getByText(/últimos eventos/i)).toBeInTheDocument();
		const audience = await screen.findByRole('region', { name: 'Público dos eventos recentes' });
		await user.click(within(audience).getByRole('button', { name: 'Ver dados em tabela' }));
		expect(within(audience).getByRole('cell', { name: '30' })).toBeInTheDocument();
		const distribution = await screen.findByRole('region', { name: 'Publicação dos eventos' });
		await user.click(within(distribution).getByRole('button', { name: 'Ver dados em tabela' }));
		expect(within(distribution).getByRole('row', { name: 'Publicados 8' })).toBeInTheDocument();
		expect(within(distribution).getByRole('row', { name: 'Outros status 4' })).toBeInTheDocument();
	});
	it('shows organizer volume in reais and published events without inventing a time series', async () => {
		const { user } = renderWithProviders(
			<PlatformOverviewCharts
				data={{
					metrics: {
						grossRevenue: 5000,
						platformRevenue: 100,
						providerFees: 50,
						organizerPayable: 4850,
						activeOrganizers: 2,
						organizers: 3,
						events: 10,
						publishedEvents: 6,
						ticketsSold: 50,
					},
					topOrganizers: [{ id: 'a', name: 'Coletivo', gross: 2500, events: 2, tickets: 25 }],
				}}
			/>,
		);
		const ranking = await screen.findByRole('region', { name: 'Organizadores por volume' });
		await user.click(within(ranking).getByRole('button', { name: 'Ver dados em tabela' }));
		expect(within(ranking).getByRole('row', { name: /Coletivo R\$\s?2.500,00/ })).toBeInTheDocument();
		const distribution = await screen.findByRole('region', { name: 'Publicação na plataforma' });
		await user.click(within(distribution).getByRole('button', { name: 'Ver dados em tabela' }));
		expect(within(distribution).getByRole('row', { name: 'Outros status 4' })).toBeInTheDocument();
	});
});
