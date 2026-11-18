'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePermissions } from '@/components/auth/PermissionsProvider';
import { toast } from '@/hooks/use-toast';
export async function iamRequest<T>(path: string, method?: string, body?: unknown): Promise<T> {
	const response = await fetch(`/api/organizer/iam/${path}`, {
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
	const { access } = usePermissions();

	return useQuery({
		queryKey: ['iam', access?.userId, access?.organizationId, resource],
		queryFn: () => iamRequest<T>(resource),
		enabled: enabled && Boolean(access?.active),
		retry: false,
	});
}
export function useTeamMutation() {
	const client = useQueryClient();
	const { access } = usePermissions();

	return useMutation({
		mutationFn: ({ path, method, body }: { path: string; method: string; body?: unknown }) =>
			iamRequest<{ delivery?: string }>(path, method, body),
		onSuccess: async (result) => {
			await client.invalidateQueries({ queryKey: ['iam', access?.userId, access?.organizationId] });
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
