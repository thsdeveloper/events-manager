'use client';
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ParticipantFilters, ParticipantsResponse } from './types';

export class ParticipantsRequestError extends Error {
	constructor(
		message: string,
		public readonly status: number,
	) {
		super(message);
	}
}
async function request<T>(path: string, signal: AbortSignal): Promise<T> {
	const response = await fetch(path, { credentials: 'include', signal });
	const data = await response.json().catch(() => null);
	if (!response.ok)
		throw new ParticipantsRequestError(data?.detail ?? 'Erro ao carregar participantes', response.status);

	return data as T;
}
export function useParticipants(filters: ParticipantFilters, page: number) {
	const client = useQueryClient();
	const options = useQuery({
		queryKey: ['participants', 'filter-options'],
		queryFn: ({ signal }) =>
			request<{ events: { id: string; title: string }[]; ticketTypes: { id: string; title: string }[] }>(
				'/api/admin/participantes/filter-options',
				signal,
			),
		staleTime: 60_000,
		retry: false,
	});
	const participants = useQuery({
		queryKey: ['participants', 'list', filters, page],
		queryFn: ({ signal }) => {
			const params = new URLSearchParams({ page: String(page) });
			if (filters.search) params.set('search', filters.search);
			for (const key of ['eventIds', 'ticketTypeIds', 'registrationStatus', 'paymentStatus'] as const) {
				if (filters[key].length) params.set(key, filters[key].join(','));
			}
			if (filters.hasCheckedIn !== null) params.set('hasCheckedIn', String(filters.hasCheckedIn));

			return request<ParticipantsResponse>(`/api/admin/participantes?${params}`, signal);
		},
		placeholderData: keepPreviousData,
		staleTime: 30_000,
		retry: false,
	});

	return { participants, options, refresh: () => client.invalidateQueries({ queryKey: ['participants'] }) };
}
