'use client';
import { useQuery } from '@tanstack/react-query';
import type { ReceivingAccountOverview } from '@events-manager/contracts';
export const receivingBase = (id: string, admin = false) =>
	admin ? `/api/super-admin/organizers/${id}/receiving-account` : `/api/organizer/receiving-accounts/${id}`;
export async function receivingRequest<T>(url: string, init?: RequestInit): Promise<T> {
	const response = await fetch(url, { credentials: 'include', cache: 'no-store', ...init });
	const data = await response.json().catch(() => null);
	if (!response.ok) throw new Error(data?.detail ?? 'Não foi possível concluir a solicitação. Tente novamente.');

	return data as T;
}
export function useReceivingOverview(id: string, admin: boolean, page: number, initialData?: ReceivingAccountOverview) {
	return useQuery({
		queryKey: ['receiving-account', admin ? 'admin' : 'owner', id, page],
		queryFn: ({ signal }) =>
			receivingRequest<ReceivingAccountOverview>(`${receivingBase(id, admin)}?page=${page}&limit=10`, { signal }),
		initialData: page === 1 ? initialData : undefined,
		staleTime: 30_000,
	});
}
