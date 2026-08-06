'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Info, Lock, Mail, User, UserPlus } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthLink } from '@/components/auth/AuthLink';
import { LoadingSpinner } from '@/components/design-system/atoms/LoadingSpinner';
import { AuthField } from '@/components/design-system/molecules/AuthField';
import { InlineAlert } from '@/components/design-system/molecules/InlineAlert';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/lib/http-client';
import { safeInternalRedirect } from '@/lib/navigation';

interface RegisterResponse {
	confirmationRequired: boolean;
	redirect?: string;
}

export default function RegisterPage() {
	const router = useRouter();
	const [firstName, setFirstName] = useState('');
	const [lastName, setLastName] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [showConfirmPassword, setShowConfirmPassword] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError('');

		if (password !== confirmPassword) {
			setError('As senhas não coincidem.');

			return;
		}

		setIsLoading(true);
		try {
			const data = await httpClient.post<RegisterResponse>(
				'/api/auth/register',
				{ email, password, firstName, lastName },
				{ toastOnError: false },
			);
			const destination = data.confirmationRequired
				? `/confirmar-email?email=${encodeURIComponent(email)}`
				: safeInternalRedirect(data.redirect, '/perfil');
			router.replace(destination);
			router.refresh();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível criar sua conta. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	};

	const passwordAction = (visible: boolean, toggle: () => void, label: string) => (
		<Button type="button" variant="ghost" size="icon" aria-label={label} aria-pressed={visible} onClick={toggle}>
			{visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
		</Button>
	);

	return (
		<AuthLayout title="Criar conta" subtitle="Preencha seus dados para começar">
			<form onSubmit={handleSubmit} className="space-y-5">
				{error ? <InlineAlert>{error}</InlineAlert> : null}

				<InlineAlert tone="info">
					<div className="flex gap-2">
						<Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
						<span>
							Sua conta começa como <strong>comprador</strong>. Para publicar eventos, solicite o perfil de organizador
							na sua conta.
						</span>
					</div>
				</InlineAlert>

				<div className="grid gap-4 sm:grid-cols-2">
					<AuthField
						id="firstName"
						label="Nome"
						icon={<User className="size-5" />}
						autoComplete="given-name"
						value={firstName}
						onChange={(event) => setFirstName(event.target.value)}
						required
						placeholder="João"
					/>
					<AuthField
						id="lastName"
						label="Sobrenome"
						icon={<User className="size-5" />}
						autoComplete="family-name"
						value={lastName}
						onChange={(event) => setLastName(event.target.value)}
						required
						placeholder="Silva"
					/>
				</div>

				<AuthField
					id="email"
					label="E-mail"
					icon={<Mail className="size-5" />}
					type="email"
					autoComplete="email"
					value={email}
					onChange={(event) => setEmail(event.target.value)}
					required
					placeholder="seu@email.com"
				/>

				<AuthField
					id="password"
					label="Senha"
					icon={<Lock className="size-5" />}
					type={showPassword ? 'text' : 'password'}
					autoComplete="new-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					required
					minLength={8}
					placeholder="••••••••"
					hint="Use pelo menos 8 caracteres."
					endAction={passwordAction(
						showPassword,
						() => setShowPassword((visible) => !visible),
						showPassword ? 'Ocultar senha' : 'Mostrar senha',
					)}
				/>

				<AuthField
					id="confirmPassword"
					label="Confirmar senha"
					icon={<Lock className="size-5" />}
					type={showConfirmPassword ? 'text' : 'password'}
					autoComplete="new-password"
					value={confirmPassword}
					onChange={(event) => setConfirmPassword(event.target.value)}
					required
					minLength={8}
					placeholder="••••••••"
					endAction={passwordAction(
						showConfirmPassword,
						() => setShowConfirmPassword((visible) => !visible),
						showConfirmPassword ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha',
					)}
				/>

				<AuthButton type="submit" isLoading={isLoading}>
					{isLoading ? (
						<>
							<LoadingSpinner /> Criando conta...
						</>
					) : (
						<>
							<UserPlus className="size-5" /> Criar conta
						</>
					)}
				</AuthButton>

				<p className="text-center text-sm text-muted-foreground">
					Já tem uma conta?{' '}
					<AuthLink href="/login" className="font-semibold">
						Fazer login
					</AuthLink>
				</p>
			</form>

			<p className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
				Seus dados são usados para criar e proteger a sua conta.
			</p>
		</AuthLayout>
	);
}
