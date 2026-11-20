import { useState } from 'react';
import { View } from 'react-native';
import { Button, Field, Label, Notice } from '../../shared/ui';
import { birthDateIso } from '../../shared/dates';
export function RegistrationForm({ onSubmit }: { onSubmit: (input: RegistrationInput) => Promise<void> }) {
	const [name, setName] = useState('');
	const [lastName, setLastName] = useState('');
	const [birth, setBirth] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState('');
	async function submit() {
		setError('');
		const date = birthDateIso(birth);
		if (!date) {
			setError('Informe uma data de nascimento válida.');
			return;
		}
		if (!name.trim() || !lastName.trim() || !/^\S+@\S+\.\S+$/.test(email.trim())) {
			setError('Preencha seu nome, sobrenome e um e-mail válido.');
			return;
		}
		if (
			password.length < 8 ||
			password.length > 64 ||
			!/[\p{L}]/u.test(password) ||
			!/[\p{N}]/u.test(password) ||
			!/[^\p{L}\p{N}]/u.test(password)
		) {
			setError('Use de 8 a 64 caracteres, com letra, número e símbolo.');
			return;
		}
		if (password !== confirmation) {
			setError('As senhas precisam ser iguais.');
			return;
		}
		setBusy(true);
		try {
			await onSubmit({
				first_name: name.trim(),
				last_name: lastName.trim(),
				email: email.trim(),
				birth_date: date,
				password,
			});
		} catch (e) {
			setError(e instanceof Error ? e.message : 'Não foi possível criar sua conta.');
		} finally {
			setBusy(false);
		}
	}
	return (
		<View style={{ gap: 16 }}>
			<Field label="Nome" value={name} onChangeText={setName} autoComplete="given-name" />
			<Field label="Sobrenome" value={lastName} onChangeText={setLastName} autoComplete="family-name" />
			<Field
				label="Data de nascimento"
				placeholder="DD/MM/AAAA"
				value={birth}
				maxLength={10}
				onChangeText={(value) => {
					const digits = value.replace(/\D/g, '').slice(0, 8);
					setBirth(digits.replace(/^(\d{2})(\d)/, '$1/$2').replace(/^(\d{2}\/\d{2})(\d)/, '$1/$2'));
				}}
				keyboardType="number-pad"
			/>
			<Field
				label="E-mail"
				value={email}
				onChangeText={setEmail}
				autoCapitalize="none"
				keyboardType="email-address"
				autoComplete="email"
			/>
			<Field
				label="Crie uma senha"
				value={password}
				onChangeText={setPassword}
				secureTextEntry
				autoComplete="new-password"
			/>
			<Label muted style={{ fontSize: 12 }}>
				De 8 a 64 caracteres, com letra, número e símbolo.
			</Label>
			<Field
				label="Confirme a senha"
				value={confirmation}
				onChangeText={setConfirmation}
				secureTextEntry
				autoComplete="new-password"
			/>
			<Notice message={error} />
			<Button label="Criar minha conta" onPress={() => void submit()} loading={busy} />
		</View>
	);
}
export type RegistrationInput = {
	first_name: string;
	last_name: string;
	email: string;
	birth_date: string;
	password: string;
};
