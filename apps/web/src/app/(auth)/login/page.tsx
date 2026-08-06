'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLink } from '@/components/auth/AuthLink';
import { httpClient } from '@/lib/http-client';
import { AuthField } from '@/components/design-system/molecules/AuthField';
import { InlineAlert } from '@/components/design-system/molecules/InlineAlert';
import { LoadingSpinner } from '@/components/design-system/atoms/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { safeInternalRedirect } from '@/lib/navigation';

interface LoginResponse {
	success: boolean;
	user: {
		id: string;
		email: string;
		first_name: string;
		last_name: string;
		role: unknown;
	};
	isOrganizer: boolean;
	redirect: string;
}

export default function LoginPage() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState('');

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');
		setIsLoading(true);

		try {
			// httpClient mostra toast automaticamente em caso de erro
			const data = await httpClient.post<LoginResponse>(
				'/api/auth/login',
				{ email, password },
				{ toastOnError: false },
			);
			const redirectUrl = safeInternalRedirect(searchParams.get('redirect'), data.redirect || '/perfil');
			router.replace(redirectUrl);
			router.refresh();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível entrar. Tente novamente.');
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<AuthLayout title="Bem-vindo de volta" subtitle="Entre com suas credenciais para acessar sua conta">
			<form onSubmit={handleSubmit} className="space-y-6">
				{error ? <InlineAlert>{error}</InlineAlert> : null}
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

				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<span className="text-sm font-medium">Senha</span>
						<AuthLink href="/esqueci-senha" className="text-sm font-medium">
							Esqueceu a senha?
						</AuthLink>
					</div>
					<AuthField
						id="password"
						label=""
						aria-label="Senha"
						icon={<Lock className="size-5" />}
						type={showPassword ? 'text' : 'password'}
						autoComplete="current-password"
						value={password}
						onChange={(event) => setPassword(event.target.value)}
						required
						placeholder="••••••••"
						minLength={8}
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
				</div>

				<AuthButton type="submit" isLoading={isLoading}>
					{isLoading ? (
						<>
							<LoadingSpinner /> Entrando...
						</>
					) : (
						<>
							<LogIn className="size-5" />
							Entrar
						</>
					)}
				</AuthButton>

				<div className="relative">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
					</div>
					<div className="relative flex justify-center text-sm">
						<span className="px-4 bg-white dark:bg-[#0e1a2b] text-gray-500 dark:text-gray-400">Ou</span>
					</div>
				</div>

				<div className="text-center">
					<p className="text-sm text-gray-600 dark:text-gray-400">
						Não tem uma conta?{' '}
						<AuthLink href="/register" className="font-semibold">
							Criar conta gratuita
						</AuthLink>
					</p>
				</div>
			</form>

			<p className="mt-8 border-t pt-6 text-center text-xs text-muted-foreground">
				Sua sessão é mantida em um cookie HTTP-only e não fica disponível para scripts do navegador.
			</p>
		</AuthLayout>
	);
}
