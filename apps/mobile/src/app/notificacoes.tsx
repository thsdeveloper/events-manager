import { useEffect } from 'react';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserEmailPreferences } from '@events-manager/contracts';
import { api } from '../shared/api';
import { useAuth } from '../features/auth/AuthProvider';
import { NotificationForm } from '../features/account/NotificationForm';
import { Button, Heading, Label, Loading, Notice, Screen } from '../shared/ui';
export default function Notifications() {
	const { user, ready } = useAuth();
	const client = useQueryClient();
	const key = ['email-preferences', user?.id];
	const query = useQuery({
		queryKey: key,
		queryFn: () => api.request<{ settings: UserEmailPreferences }>('/api/user/notification-preferences'),
		enabled: Boolean(user),
	});
	useEffect(() => {
		if (ready && !user) router.replace('/login');
	}, [ready, user]);
	return (
		<Screen back title="Notificações">
			<Heading>Você escolhe o que receber.</Heading>
			<Label muted>Personalize os e-mails da Flouvi para acompanhar o que importa para você.</Label>
			{query.isPending ? (
				<Loading />
			) : query.data ? (
				<NotificationForm
					settings={query.data.settings}
					onSave={async (settings) => {
						const saved = await api.request<{ settings: UserEmailPreferences }>('/api/user/notification-preferences', {
							method: 'PUT',
							body: JSON.stringify(settings),
						});
						client.setQueryData(key, saved);
					}}
				/>
			) : (
				<>
					<Notice message="Não foi possível carregar suas preferências." />
					<Button label="Tentar novamente" onPress={() => void query.refetch()} />
				</>
			)}
		</Screen>
	);
}
