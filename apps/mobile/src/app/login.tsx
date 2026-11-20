import { useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import type { AppUser } from '@events-manager/contracts';
import { useAuth } from '../features/auth/AuthProvider';
import { CredentialsForm } from '../features/auth/CredentialsForm';
import { RegistrationForm } from '../features/auth/RegistrationForm';
import { api } from '../shared/api';
import type { Session } from '../shared/api/client';
import { ApiError } from '../shared/api/client';
import { Button, Card, Field, Heading, Label, Notice, Screen, s } from '../shared/ui';
import { config } from '../shared/config';
type AuthResult = { user: AppUser; session: Session; confirmationRequired?: boolean };
export default function Login() {
	const params = useLocalSearchParams<{ mode?: string; event?: string }>();
	const { accept } = useAuth();
	const [mode, setMode] = useState(params.mode === 'register' ? 'register' : 'login');
	const [email, setEmail] = useState('');
	const [code, setCode] = useState('');
	const [busy, setBusy] = useState(false);
	const [notice, setNotice] = useState('');
	const finish = async (result: AuthResult) => {
		await accept(result);
		if (params.event && /^[a-z0-9-]+$/.test(params.event))
			router.replace({ pathname: '/navegador', params: { destination: `/eventos/${params.event}/checkout` } });
		else router.replace('/ingressos');
	};
	const change = (next: string) => {
		setNotice('');
		setMode(next);
	};
	async function action(work: () => Promise<void>) {
		setBusy(true);
		setNotice('');
		try {
			await work();
		} catch (e) {
			setNotice(e instanceof Error ? e.message : 'Não foi possível concluir. Tente novamente.');
		} finally {
			setBusy(false);
		}
	}
	const titles: Record<string, string> = {
		login: 'Seu próximo encontro começa aqui.',
		register: 'Vamos criar sua conta?',
		confirm: 'Confira seu e-mail',
		forgot: 'Recupere sua senha',
	};
	return (
		<KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
			<Screen back title="Sua conta Flouvi">
				<Heading>{titles[mode]}</Heading>
				<Label muted>
					{mode === 'confirm'
						? `Enviamos um código de 6 dígitos para ${email}. Digite abaixo para confirmar seu cadastro.`
						: mode === 'register'
							? 'Guarde seus ingressos, descubra eventos e viva novas histórias.'
							: mode === 'forgot'
								? 'Você receberá as instruções para escolher uma nova senha.'
								: 'Entre para acessar seus ingressos e continuar sua compra.'}
				</Label>
				<Card>
					{mode === 'login' ? (
						<>
							<CredentialsForm
								onSubmit={async (mail, password) => {
									setEmail(mail);
									try {
										await finish(
											await api.request<AuthResult>('/api/auth/mobile/login', {
												method: 'POST',
												body: JSON.stringify({ email: mail, password }),
											}),
										);
									} catch (e) {
										if (e instanceof ApiError && e.code === 'EMAIL_NOT_CONFIRMED') {
											change('confirm');
											setNotice('Confirme seu e-mail para entrar. Você pode solicitar um novo código abaixo.');
										} else throw e;
									}
								}}
							/>
							<Button secondary label="Esqueci minha senha" onPress={() => change('forgot')} />
						</>
					) : null}
					{mode === 'register' ? (
						<RegistrationForm
							onSubmit={async (input) => {
								setEmail(input.email);
								const result = await api.request<AuthResult>('/api/auth/mobile/register', {
									method: 'POST',
									body: JSON.stringify(input),
								});
								if (result.confirmationRequired) change('confirm');
								else await finish(result);
							}}
						/>
					) : null}
					{mode === 'confirm' ? (
						<>
							<Field
								label="Código de confirmação"
								value={code}
								onChangeText={(value) => setCode(value.replace(/\D/g, '').slice(0, 6))}
								keyboardType="number-pad"
								autoComplete="one-time-code"
								maxLength={6}
							/>
							<Button
								label="Confirmar meu e-mail"
								loading={busy}
								disabled={code.length !== 6}
								onPress={() =>
									void action(async () =>
										finish(
											await api.request<AuthResult>('/api/auth/mobile/register/confirm', {
												method: 'POST',
												body: JSON.stringify({ email, token: code }),
											}),
										),
									)
								}
							/>
							<Button
								secondary
								label="Reenviar código"
								disabled={busy}
								onPress={() =>
									void action(async () => {
										await api.request('/api/auth/register/resend', { method: 'POST', body: JSON.stringify({ email }) });
										setNotice('Se o cadastro ainda precisa de confirmação, um novo código chegará ao seu e-mail.');
									})
								}
							/>
						</>
					) : null}
					{mode === 'forgot' ? (
						<>
							<Field
								label="E-mail"
								value={email}
								onChangeText={setEmail}
								autoCapitalize="none"
								keyboardType="email-address"
							/>
							<Button
								label="Enviar instruções"
								loading={busy}
								disabled={!email.trim()}
								onPress={() =>
									void action(async () => {
										await api.request('/api/auth/password/request', {
											method: 'POST',
											body: JSON.stringify({ email: email.trim() }),
										});
										setNotice(
											'Se houver uma conta com esse e-mail, as instruções chegarão em instantes. Confira também a pasta de spam.',
										);
									})
								}
							/>
						</>
					) : null}
					<Notice message={notice} />
				</Card>
				<View style={s.section}>
					<Button
						secondary
						label={mode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}
						onPress={() => change(mode === 'login' ? 'register' : 'login')}
					/>
					<Label muted style={{ fontSize: 12, textAlign: 'center' }}>
						Seus ingressos e dados são os mesmos do site Flouvi.
					</Label>
					<Button
						secondary
						label="Privacidade e proteção de dados"
						onPress={() => void WebBrowser.openBrowserAsync(`${config.webUrl}/politica-de-privacidade`)}
					/>
				</View>
			</Screen>
		</KeyboardAvoidingView>
	);
}
