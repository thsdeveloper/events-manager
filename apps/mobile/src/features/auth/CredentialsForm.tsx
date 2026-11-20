import { useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Notice } from '../../shared/ui';
export function CredentialsForm({ onSubmit }: { onSubmit: (email: string, password: string) => Promise<void> }) {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	const submit = async () => {
		setBusy(true);
		setError('');
		try {
			await onSubmit(email.trim(), password);
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Não foi possível entrar. Tente novamente.');
		} finally {
			setBusy(false);
		}
	};
	return (
		<View style={{ gap: 18 }}>
			<Field
				label="E-mail"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
				autoComplete="email"
			/>
			<Field
				label="Senha"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				autoComplete="current-password"
				onSubmitEditing={() => void submit()}
			/>
			<Notice message={error} />
			<Button
				label="Entrar"
				onPress={() => void submit()}
				loading={busy}
				disabled={!email || !password}
				icon="arrow-right"
			/>
		</View>
	);
}
