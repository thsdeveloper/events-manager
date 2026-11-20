import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { BrowserFrame } from '../features/checkout/BrowserFrame';
import { safeDestination } from '../features/checkout/policy';
import { useAuth } from '../features/auth/AuthProvider';
import { api } from '../shared/api';
import { Button, Loading, Notice, Screen } from '../shared/ui';
export default function Browser() {
	const { destination: raw } = useLocalSearchParams<{ destination: string }>();
	const destination = safeDestination(raw);
	const [token, setToken] = useState<string>();
	const [error, setError] = useState('');
	const { user, ready, reload } = useAuth();
	const queries = useQueryClient();
	useEffect(() => {
		let active = true;
		if (!ready) return;
		if (!user) {
			router.replace('/login');
			return;
		}
		if (!destination) {
			setError('Este destino não está disponível no aplicativo.');
			return;
		}
		void (async () => {
			try {
				await api.request('/api/auth/me');
				const session = await api.session();
				if (active && session) setToken(session.accessToken);
			} catch {
				if (active) setError('Sua sessão precisa ser renovada. Entre novamente para continuar.');
			}
		})();
		return () => {
			active = false;
		};
	}, [ready, user?.id, destination]);
	useEffect(
		() => () => {
			void queries.invalidateQueries({ queryKey: ['tickets'] });
			void queries.invalidateQueries({ queryKey: ['purchase'] });
			void reload().catch(() => {});
		},
		[queries],
	);
	return (
		<Screen title="Flouvi · ambiente seguro" back scroll={false}>
			{error ? (
				<View style={{ padding: 24, gap: 16 }}>
					<Notice message={error} />
					<Button label="Entrar novamente" onPress={() => router.replace('/login')} />
				</View>
			) : token && destination ? (
				<BrowserFrame accessToken={token} destination={destination} />
			) : (
				<Loading />
			)}
			<View style={{ padding: 16, paddingBottom: 28 }}>
				<Button secondary label="Voltar aos meus ingressos" onPress={() => router.replace('/ingressos')} />
			</View>
		</Screen>
	);
}
