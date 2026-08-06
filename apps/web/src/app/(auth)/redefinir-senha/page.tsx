'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { CheckCircle, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoadingSpinner } from '@/components/design-system/atoms/LoadingSpinner';
import { AuthField } from '@/components/design-system/molecules/AuthField';
import { InlineAlert } from '@/components/design-system/molecules/InlineAlert';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/lib/http-client';

type ResetState = 'checking' | 'ready' | 'invalid' | 'success';

export default function ResetPasswordPage() {
	const [accessToken, setAccessToken] = useState('');
	const [password, setPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [error, setError] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [state, setState] = useState<ResetState>('checking');

	useEffect(() => {
		const hash = new URLSearchParams(window.location.hash.slice(1));
		const query = new URLSearchParams(window.location.search);
		const token = hash.get('access_token') ?? query.get('access_token');
		const recoveryType = hash.get('type') ?? query.get('type');

		window.history.replaceState({}, document.title, window.location.pathname);
		if (!token || (recoveryType && recoveryType !== 'recovery')) {
			setState('invalid');

			return;
		}
		setAccessToken(token);
		setState('ready');
	}, []);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setError('');
		if (password !== confirmPassword) {
			setError('As senhas não coincidem.');

			return;
		}

		setIsLoading(true);
		try {
			await httpClient.post(
				'/api/auth/password/reset',
				{ access_token: accessToken, password },
				{ toastOnError: false },
			);
			setAccessToken('');
			setState('success');
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível redefinir a senha. Solicite outro link.');
		} finally {
			setIsLoading(false);
		}
	};

	if (state === 'checking') {
		return (
			<AuthLayout title="Validando link" subtitle="Aguarde um instante">
				<div role="status" className="flex justify-center py-12 text-primary">
					<LoadingSpinner className="size-8" />
					<span className="sr-only">Validando link de recuperação</span>
				</div>
			</AuthLayout>
		);
	}

	if (state === 'invalid') {
		return (
			<AuthLayout title="Link inválido" subtitle="Não foi possível validar esta recuperação">
				<div className="space-y-5">
					<InlineAlert>O link está incompleto ou não é mais válido. Solicite uma nova recuperação.</InlineAlert>
					<Button asChild className="w-full">
						<Link href="/esqueci-senha">Solicitar novo link</Link>
					</Button>
				</div>
			</AuthLayout>
		);
	}

	if (state === 'success') {
		return (
			<AuthLayout title="Senha atualizada" subtitle="Sua nova senha já pode ser usada">
				<div className="space-y-6 text-center">
					<div className="mx-auto flex size-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/20">
						<CheckCircle aria-hidden="true" className="size-10 text-emerald-600 dark:text-emerald-400" />
					</div>
					<Button asChild className="w-full">
						<Link href="/login">Entrar com a nova senha</Link>
					</Button>
				</div>
			</AuthLayout>
		);
	}

	return (
		<AuthLayout title="Crie uma nova senha" subtitle="Escolha uma senha que você não usa em outros serviços">
			<form onSubmit={handleSubmit} className="space-y-6">
				{error ? <InlineAlert>{error}</InlineAlert> : null}
				<AuthField
					id="password"
					label="Nova senha"
					icon={<Lock className="size-5" />}
					type={showPassword ? 'text' : 'password'}
					autoComplete="new-password"
					value={password}
					onChange={(event) => setPassword(event.target.value)}
					required
					minLength={8}
					placeholder="••••••••"
					hint="Use pelo menos 8 caracteres."
					endAction={
						<Button
							type="button"
							variant="ghost"
							size="icon"
							aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
							aria-pressed={showPassword}
							onClick={() => setShowPassword((visible) => !visible)}
						>
							{showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
						</Button>
					}
				/>
				<AuthField
					id="confirmPassword"
					label="Confirme a nova senha"
					icon={<KeyRound className="size-5" />}
					type={showPassword ? 'text' : 'password'}
					autoComplete="new-password"
					value={confirmPassword}
					onChange={(event) => setConfirmPassword(event.target.value)}
					required
					minLength={8}
					placeholder="••••••••"
				/>
				<AuthButton type="submit" isLoading={isLoading}>
					{isLoading ? (
						<>
							<LoadingSpinner /> Atualizando...
						</>
					) : (
						<>
							<KeyRound className="size-5" /> Atualizar senha
						</>
					)}
				</AuthButton>
			</form>
		</AuthLayout>
	);
}
