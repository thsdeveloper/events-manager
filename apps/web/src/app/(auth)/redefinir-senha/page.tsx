'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle, Eye, EyeOff, KeyRound, Lock } from 'lucide-react';
import { AuthButton } from '@/components/auth/AuthButton';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { LoadingSpinner } from '@/components/design-system/atoms/LoadingSpinner';
import { AuthField, registerField } from '@/components/design-system/molecules/AuthField';
import { InlineAlert } from '@/components/design-system/molecules/InlineAlert';
import { Button } from '@/components/ui/button';
import { httpClient } from '@/lib/http-client';
import { resetPasswordSchema, type ResetPasswordValues } from '@/lib/validation/auth';

type ResetState = 'checking' | 'ready' | 'invalid' | 'expired' | 'success';

export default function ResetPasswordPage() {
	const [accessToken, setAccessToken] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [state, setState] = useState<ResetState>('checking');

	const {
		register,
		handleSubmit,
		formState: { errors, isSubmitting },
	} = useForm<ResetPasswordValues>({
		resolver: zodResolver(resetPasswordSchema),
		defaultValues: { password: '', confirmPassword: '' },
		mode: 'onTouched',
	});

	useEffect(() => {
		const hash = new URLSearchParams(window.location.hash.slice(1));
		const query = new URLSearchParams(window.location.search);
		const token = hash.get('access_token') ?? query.get('access_token');
		const recoveryType = hash.get('type') ?? query.get('type');
		const errorCode = hash.get('error_code') ?? query.get('error_code');

		window.history.replaceState({}, document.title, window.location.pathname);

		// O token do e-mail é de uso único: abrir o link duas vezes, ou recarregar
		// esta página depois que o hash foi limpo, devolve otp_expired. Sem separar
		// esse caso o usuário lê "link incompleto" e tenta o mesmo link de novo.
		if (errorCode === 'otp_expired' || errorCode === 'access_denied') {
			setState('expired');

			return;
		}
		if (!token || (recoveryType && recoveryType !== 'recovery')) {
			setState('invalid');

			return;
		}
		setAccessToken(token);
		setState('ready');
	}, []);

	const onSubmit = async ({ password }: ResetPasswordValues) => {
		try {
			await httpClient.post('/api/auth/password/reset', { access_token: accessToken, password });
			setAccessToken('');
			setState('success');
		} catch {
			// Já exibido pelo toast de erro do httpClient.
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

	if (state === 'expired') {
		return (
			<AuthLayout title="Link expirado" subtitle="Esta recuperação já foi utilizada">
				<div className="space-y-5">
					<InlineAlert>
						Este link só pode ser aberto uma vez e vale por 15 minutos. Solicite uma nova recuperação para receber um
						link novo.
					</InlineAlert>
					<Button asChild className="w-full">
						<Link href="/esqueci-senha">Solicitar novo link</Link>
					</Button>
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
			<form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
				<AuthField
					id="password"
					label="Nova senha"
					icon={<Lock className="size-5" />}
					type={showPassword ? 'text' : 'password'}
					autoComplete="new-password"
					placeholder="••••••••"
					hint="Pelo menos 8 caracteres, com letras, números e um caractere especial."
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
				<AuthField
					id="confirmPassword"
					label="Confirme a nova senha"
					icon={<KeyRound className="size-5" />}
					type={showPassword ? 'text' : 'password'}
					autoComplete="new-password"
					placeholder="••••••••"
					error={errors.confirmPassword?.message}
					{...registerField(register('confirmPassword'))}
				/>
				<AuthButton type="submit" isLoading={isSubmitting}>
					<KeyRound className="size-5" /> Atualizar senha
				</AuthButton>
			</form>
		</AuthLayout>
	);
}
