'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTeamRuntime } from './team-runtime';
import { toast } from '@/hooks/use-toast';
export async function iamRequest<T>(
	path: string,
	method?: string,
	body?: unknown,
	apiBase = '/api/organizer/iam',
): Promise<T> {
	const response = await fetch(`${apiBase}/${path}`, {
		credentials: 'include',
		cache: 'no-store',
		...(method ? { method } : {}),
		...(body ? { headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) } : {}),
	});
	const result = await response.json();
	if (!response.ok) throw new Error(result.detail ?? 'Não foi possível concluir a solicitação.');

	return result as T;
}
export function useTeamQuery<T>(resource: string, enabled: boolean) {
	const runtime = useTeamRuntime();

	return useQuery({
		queryKey: ['iam', runtime.userId, runtime.contextId, resource],
		queryFn: () => iamRequest<T>(resource, undefined, undefined, runtime.apiBase),
		enabled: enabled && runtime.active,
		retry: false,
	});
}
export function useTeamMutation() {
	const client = useQueryClient();
	const runtime = useTeamRuntime();

	return useMutation({
		mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) =>
			iamRequest<{ delivery?: string }>(path, method, body, runtime.apiBase),
		onSuccess: async (result) => {
			await client.invalidateQueries({ queryKey: ['iam', runtime.userId, runtime.contextId] });
			toast(
				result.delivery === 'failed'
					? {
							variant: 'destructive',
							title: 'Convite registrado, mas o e-mail não foi enviado.',
							description: 'Use Reenviar para tentar a entrega novamente.',
						}
					: { title: result.delivery === 'sent' ? 'Convite enviado.' : 'Alteração salva.' },
			);
		},
		onError: (error: Error) =>
			toast({ variant: 'destructive', title: 'Não foi possível concluir', description: error.message }),
	});
}
