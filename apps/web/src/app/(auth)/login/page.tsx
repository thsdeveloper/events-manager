'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Eye, EyeOff, Lock, LogIn, Mail } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLink } from '@/components/auth/AuthLink';
import { httpClient } from '@/lib/http-client';
import { AuthField, registerField } from '@/components/design-system/molecules/AuthField';
import { Button } from '@/components/ui/button';
import { safeInternalRedirect } from '@/lib/navigation';
import { loginSchema, type LoginValues } from '@/lib/validation/auth';

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
	const [showPassword, setShowPassword] = useState(false);

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<LoginValues>({
		resolver: zodResolver(loginSchema),
		defaultValues: { email: '', password: '' },
		// Validate once the field has been left, then live as it is corrected —
		// no errors are shown while the user is still filling a field in.
		mode: 'onTouched',
	});

	const onSubmit = async (values: LoginValues) => {
		try {
			// httpClient mostra toast automaticamente em caso de erro
			const data = await httpClient.post<LoginResponse>('/api/auth/login', values);
			const redirectUrl = safeInternalRedirect(searchParams.get('redirect'), data.redirect || '/perfil');
			router.replace(redirectUrl);
			router.refresh();
		} catch {
			// Já exibido pelo toast de erro do httpClient.
		}
	};

	return (
		<AuthLayout title="Bem-vindo de volta" subtitle="Entre com suas credenciais para acessar sua conta">
			<form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
				<AuthField
					id="email"
					label="E-mail"
					icon={<Mail className="size-5" />}
					type="email"
					autoComplete="email"
					placeholder="seu@email.com"
					error={errors.email?.message}
					{...registerField(register('email'))}
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
						placeholder="••••••••"
						error={errors.password?.message}
						{...registerField(register('password'))}
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

				<AuthButton type="submit" isLoading={isSubmitting}>
					<LogIn className="size-5" />
					Entrar
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
		</AuthLayout>
	);
}
