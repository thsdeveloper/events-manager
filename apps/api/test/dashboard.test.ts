import type { OrganizerDashboard } from '@events-manager/contracts';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';
import {
	GetOrganizerDashboard,
	type OrganizerDashboardRepository,
} from '../src/application/dashboard/get-organizer-dashboard.js';
import { SupabaseOrganizerDashboardRepository } from '../src/infrastructure/supabase/organizer-dashboard-repository.js';

const snapshot: OrganizerDashboard = {
	metrics: {
		totalEvents: 4,
		publishedEvents: 3,
		upcomingEvents: 2,
		participants: 180,
		ticketsSold: 175,
		grossRevenue: 12_450.5,
	},
	recentEvents: [
		{
			id: '00000000-0000-4000-8000-000000000010',
			title: 'Conferência de Produto',
			slug: 'conferencia-de-produto',
			status: 'published',
			startDate: '2026-09-10T18:00:00.000Z',
			location: 'São Paulo',
			participantCount: 120,
			ticketsSold: 118,
		},
	],
};

describe('GetOrganizerDashboard', () => {
	it('loads the dashboard through its application port', async () => {
		const repository: OrganizerDashboardRepository = {
			getByOrganizerId: vi.fn().mockResolvedValue(snapshot),
		};
		const useCase = new GetOrganizerDashboard(repository);

		await expect(useCase.execute('00000000-0000-4000-8000-000000000001')).resolves.toEqual(snapshot);
		expect(repository.getByOrganizerId).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001');
	});

	it('does not hide repository failures from the HTTP boundary', async () => {
		const failure = new Error('database unavailable');
		const repository: OrganizerDashboardRepository = {
			getByOrganizerId: vi.fn().mockRejectedValue(failure),
		};

		await expect(new GetOrganizerDashboard(repository).execute('organizer-id')).rejects.toBe(failure);
	});
});

describe('SupabaseOrganizerDashboardRepository', () => {
	it('calls the service-only RPC and validates its contract', async () => {
		const rpc = vi.fn().mockResolvedValue({ data: snapshot, error: null });
		const database = { rpc } as unknown as SupabaseClient;

		await expect(
			new SupabaseOrganizerDashboardRepository(database).getByOrganizerId('00000000-0000-4000-8000-000000000001'),
		).resolves.toEqual(snapshot);
		expect(rpc).toHaveBeenCalledWith('get_organizer_dashboard', {
			target_organizer: '00000000-0000-4000-8000-000000000001',
		});
	});

	it('rejects malformed database responses at the infrastructure boundary', async () => {
		const database = {
			rpc: vi.fn().mockResolvedValue({ data: { metrics: {} }, error: null }),
		} as unknown as SupabaseClient;

		await expect(
			new SupabaseOrganizerDashboardRepository(database).getByOrganizerId('organizer-id'),
		).rejects.toMatchObject({ name: 'ZodError' });
	});
});
