import { waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { createTestQueryClient, jsonResponse, mockFetch, renderHookWithProviders } from '@/test';
import { useParticipants } from './useParticipants';
import type { ParticipantFilters } from './types';
const filters: ParticipantFilters = {
	search: '',
	eventIds: [],
	ticketTypeIds: [],
	registrationStatus: [],
	paymentStatus: [],
	hasCheckedIn: null,
	checkInDateRange: { start: null, end: null },
};
describe('participants queries', () => {
	it('shares requests, cancels obsolete work and reuses fresh pages', async () => {
		const network = mockFetch([
			['filter-options', () => jsonResponse({ events: [], ticketTypes: [] })],
			[
				'/api/admin/participantes?',
				(input) =>
					jsonResponse({
						data: [],
						meta: { page: Number(new URL(String(input), 'http://test').searchParams.get('page')) },
					}),
			],
		]);
		const queryClient = createTestQueryClient();
		queryClient.setDefaultOptions({ queries: { retry: false, gcTime: 300_000 } });
		const { result, rerender } = renderHookWithProviders(({ page }) => useParticipants(filters, page), {
			initialProps: { page: 1 },
			queryClient,
		});
		await waitFor(() => expect(result.current.participants.isSuccess).toBe(true));
		rerender({ page: 2 });
		expect(result.current.participants.data?.meta.page).toBe(1);
		await waitFor(() => expect(result.current.participants.data?.meta.page).toBe(2));
		rerender({ page: 1 });
		await waitFor(() => expect(result.current.participants.data?.meta.page).toBe(1));
		expect(network.mock.calls.filter(([, init]) => !init?.signal?.aborted)).toHaveLength(3);
		expect(network.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal);
		await result.current.refresh();
		await waitFor(() => expect(network.mock.calls.filter(([, init]) => !init?.signal?.aborted)).toHaveLength(5));
	});
	it('exposes expired sessions without retrying protected requests', async () => {
		const network = mockFetch([
			['/api/admin/participantes', () => jsonResponse({ detail: 'Sessão expirada' }, { status: 401 })],
		]);
		const { result } = renderHookWithProviders(() => useParticipants(filters, 1));
		await waitFor(() => expect(result.current.participants.isError).toBe(true));
		expect(result.current.participants.error).toMatchObject({ status: 401 });
		expect(network.mock.calls.filter(([, init]) => !init?.signal?.aborted)).toHaveLength(2);
	});
});
