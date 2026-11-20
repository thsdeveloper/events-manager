import { useState } from 'react';
import { View } from 'react-native';
import Feather from '@expo/vector-icons/Feather';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../../features/auth/AuthProvider';
import { config } from '../../shared/config';
import { colors as c, fonts } from '../../shared/theme';
import { Badge, Button, Card, Heading, Label, Loading, Notice, Screen, s } from '../../shared/ui';
export default function Account() {
	const { user, ready, logout } = useAuth();
	const [busy, setBusy] = useState(false);
	const [message, setMessage] = useState('');
	const profile = (section: string) =>
		router.push({ pathname: '/navegador', params: { destination: `/perfil?section=${section}` } });
	if (!ready)
		return (
			<Screen title="Minha conta">
				<Loading />
			</Screen>
		);
	if (!user)
		return (
			<Screen title="Minha conta">
				<View style={{ backgroundColor: c.mist, padding: 26, borderRadius: 26, gap: 22 }}>
					<Feather name="smile" color={c.violet} size={46} />
					<Heading>O melhor dos eventos, com você.</Heading>
					<Label muted>Crie sua conta para comprar, acompanhar pagamentos e guardar seus ingressos.</Label>
					<Button
						label="Criar minha conta"
						onPress={() => router.push({ pathname: '/login', params: { mode: 'register' } })}
					/>
					<Button secondary label="Já tenho conta" onPress={() => router.push('/login')} />
				</View>
			</Screen>
		);
	const complete =
		user.first_name &&
		user.last_name &&
		user.birth_date &&
		user.email &&
		user.document &&
		user.phone &&
		user.phone_verified_at;
	return (
		<Screen title="Minha conta">
			<Card>
				<View style={s.row}>
					<View
						style={{
							width: 64,
							height: 64,
							borderRadius: 24,
							backgroundColor: c.violet,
							alignItems: 'center',
							justifyContent: 'center',
						}}
					>
						<Label style={{ fontFamily: fonts.bold, fontSize: 25, color: c.white }}>
							{user.first_name?.[0]?.toUpperCase() || 'F'}
						</Label>
					</View>
					<View style={{ flex: 1 }}>
						<Heading small>
							{user.first_name} {user.last_name}
						</Heading>
						<Label muted style={{ fontSize: 13 }}>
							{user.email}
						</Label>
					</View>
				</View>
				<Badge
					label={complete ? 'Pronto para seu próximo evento' : 'Vamos completar seu cadastro'}
					tone={complete ? 'success' : 'warning'}
				/>
				{!complete ? (
					<Label muted>
						Para comprar, precisamos do seu nome, nascimento, CPF e telefone confirmado por SMS. Você pode completar
						tudo agora ou durante a compra.
					</Label>
				) : null}
				<Button
					label={complete ? 'Meus dados' : 'Completar meu cadastro'}
					icon="user"
					onPress={() => profile('personal')}
				/>
			</Card>
			<View style={s.section}>
				<Button secondary label="Meus ingressos" icon="tag" onPress={() => router.navigate('/ingressos')} />
				<Button secondary label="Notificações por e-mail" icon="mail" onPress={() => router.push('/notificacoes')} />
				<Button secondary label="Senha e segurança" icon="shield" onPress={() => profile('security')} />
				<Button
					secondary
					label="Privacidade"
					icon="lock"
					onPress={() =>
						void WebBrowser.openBrowserAsync(`${config.webUrl}/politica-de-privacidade`).catch(() =>
							setMessage('Não foi possível abrir a página.'),
						)
					}
				/>
			</View>
			<Notice message={message} />
			<Button
				secondary
				label="Sair da conta"
				icon="log-out"
				loading={busy}
				onPress={() => {
					setBusy(true);
					void logout()
						.catch(() => {})
						.finally(() => setBusy(false));
				}}
			/>
			<Label muted style={{ fontSize: 12, textAlign: 'center' }}>
				Flouvi · v1.0.0
			</Label>
		</Screen>
	);
}
