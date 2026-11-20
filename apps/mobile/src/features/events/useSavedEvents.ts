import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Event } from '@events-manager/contracts';
export function useSavedEvents(userId?: string) {
	const key = `flouvi.saved.${userId || 'guest'}`;
	const client = useQueryClient();
	const query = useQuery({
		queryKey: ['saved', key],
		queryFn: async (): Promise<Event[]> => {
			try {
				return JSON.parse((await AsyncStorage.getItem(key)) || '[]');
			} catch {
				return [];
			}
		},
	});
	const change = useMutation({
		mutationFn: async (event: Event) => {
			const current = query.data || [];
			const exists = current.some((e) => e.id === event.id);
			const next = exists
				? current.filter((e) => e.id !== event.id)
				: [
						{
							id: event.id,
							slug: event.slug,
							title: event.title,
							cover_image: event.cover_image,
							start_date: event.start_date,
							end_date: event.end_date,
							location_name: event.location_name,
							is_free: event.is_free,
							category_id: event.category_id,
						} as Event,
						...current,
					].slice(0, 100);
			await AsyncStorage.setItem(key, JSON.stringify(next));
			return next;
		},
		onSuccess: (value) => client.setQueryData(['saved', key], value),
	});
	return {
		...query,
		toggle: change.mutateAsync,
		isSaving: change.isPending,
		has: (id: string) => query.data?.some((event) => event.id === id) ?? false,
	};
}
