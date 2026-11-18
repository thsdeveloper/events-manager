'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { OrganizerAdminUpdate, OrganizerSupportDetail } from '@events-manager/contracts';
export async function organizerRequest<T>(path: string, init?: RequestInit): Promise<T> {
	const response = await fetch(path, {
		credentials: 'include',
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers },
	});
	const body = await response.json().catch(() => null);
	if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível concluir a solicitação.');

	return body as T;
}
export function useOrganizerSupport(initialDetail: OrganizerSupportDetail) {
	const id = initialDetail.organizer.id;
	const client = useQueryClient();
	const key = ['super-admin', 'organizer', id];
	const detail = useQuery({
		queryKey: key,
		queryFn: () => organizerRequest<OrganizerSupportDetail>(`/api/super-admin/organizers/${id}`),
		initialData: initialDetail,
		staleTime: 30_000,
	});
	const update = useMutation({
		mutationFn: (input: OrganizerAdminUpdate) =>
			organizerRequest(`/api/super-admin/organizers/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
		onSuccess: () => client.invalidateQueries({ queryKey: key }),
	});
	const addNote = useMutation({
		mutationFn: (note: string) =>
			organizerRequest(`/api/super-admin/organizers/${id}/notes`, { method: 'POST', body: JSON.stringify({ note }) }),
		onSuccess: () => client.invalidateQueries({ queryKey: [...key, 'records', 'activity'] }),
	});

	return { detail, update, addNote };
}
