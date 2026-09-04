'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
	Check,
	Eye,
	EyeOff,
	KeyRound,
	LogOut,
	MailCheck,
	Monitor,
	ShieldCheck,
} from 'lucide-react';

import { LockKeyhole } from '@/components/animate-ui/icons/lock-keyhole';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/validation/auth';
import type { ProfileUser } from './types';

interface ProfileSecurityProps {
	user: ProfileUser;
	onLogout: () => Promise<void>;
}

export function ProfileSecurity({ user, onLogout }: ProfileSecurityProps) {
	const { toast } = useToast();
	const [showPassword, setShowPassword] = useState(false);

	const {
		register,
		handleSubmit,
		reset,
		setError,
		setFocus,
		watch,
		formState: { errors, isSubmitting },
	} = useForm<ChangePasswordValues>({
		resolver: zodResolver(changePasswordSchema),
		defaultValues: { currentPassword: '', password: '', confirmPassword: '' },
		mode: 'onTouched',
	});

	// Drives the live checklist below the fields, which updates on every
	// keystroke rather than waiting for the field to be left.
	const currentPassword = watch('currentPassword');
	const password = watch('password');
	const confirmPassword = watch('confirmPassword');
	const passwordLongEnough = password.length >= 8 && password.length <= 64;
	// Mirrors `newPasswordSchema` in @events-manager/contracts: a special
	// character is anything that is neither a letter nor a number.
	const passwordHasLetter = /\p{L}/u.test(password);
	const passwordHasNumber = /\p{N}/u.test(password);
	const passwordHasSymbol = /[^\p{L}\p{N}]/u.test(password);
	const passwordsMatch = Boolean(password) && password === confirmPassword;
	const passwordIsNew = Boolean(password) && password !== currentPassword;

	const onSubmit = async (values: ChangePasswordValues) => {
		try {
			const response = await fetch('/api/user/password', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ currentPassword: values.currentPassword, password: values.password }),
			});
			const problem = await response.json().catch(() => null);

			if (!response.ok) {
				// A wrong current password belongs under its field, not in a toast the
				// user has to map back to an input.
				if (problem?.title === 'INVALID_CURRENT_PASSWORD') {
					setError('currentPassword', { type: 'server', message: problem.detail });
					setFocus('currentPassword');

					return;
				}
				throw new Error(problem?.detail ?? 'Não foi possível alterar sua senha.');
			}

			reset();
			toast({
				title: 'Senha atualizada',
				description: problem?.otherSessionsRevoked
					? 'As sessões abertas em outros dispositivos foram encerradas.'
					: 'Use a nova senha no seu próximo acesso.',
				variant: 'success',
			});
		} catch (submitError) {
			toast({
				title: 'Não foi possível alterar a senha',
				description: submitError instanceof Error ? submitError.message : 'Tente novamente em alguns instantes.',
				variant: 'destructive',
			});
		}
	};

	return (
		<div className="space-y-6">
			<section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
				<header className="border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8 sm:py-6">
					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
							<ShieldCheck className="size-5" />
						</div>
						<div>
							<h1 className="text-xl font-semibold text-slate-950 dark:text-white">Segurança da conta</h1>
							<p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
								Atualize sua senha e confira os dados usados para acessar a plataforma.
							</p>
						</div>
					</div>
				</header>

				<div className="grid gap-8 p-6 sm:p-8 xl:grid-cols-[1fr_0.85fr]">
					<form onSubmit={handleSubmit(onSubmit)} noValidate>
						<div className="flex items-center gap-2">
							<KeyRound className="size-4 text-slate-400" />
							<h2 className="text-sm font-semibold text-slate-900 dark:text-white">Criar nova senha</h2>
						</div>

						<div className="mt-5 space-y-5">
							<div className="space-y-2">
								<Label htmlFor="current-password">Senha atual</Label>
								<Input
									id="current-password"
									type="password"
									autoComplete="current-password"
									aria-invalid={errors.currentPassword ? true : undefined}
									aria-describedby={errors.currentPassword ? 'current-password-error' : undefined}
									className="h-11 rounded-lg"
									{...register('currentPassword')}
								/>
								{errors.currentPassword && (
									<p id="current-password-error" role="alert" className="text-xs font-medium text-destructive">
										{errors.currentPassword.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="new-password">Nova senha</Label>
								<div className="relative">
									<Input
										id="new-password"
										type={showPassword ? 'text' : 'password'}
										autoComplete="new-password"
										aria-invalid={errors.password ? true : undefined}
										aria-describedby={errors.password ? 'new-password-error' : undefined}
										className="h-11 rounded-lg pr-11"
										{...register('password')}
									/>
									<button
										type="button"
										onClick={() => setShowPassword((current) => !current)}
										className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
										aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
									>
										{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
									</button>
								</div>
								{errors.password && (
									<p id="new-password-error" role="alert" className="text-xs font-medium text-destructive">
										{errors.password.message}
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirm-password">Confirmar nova senha</Label>
								<Input
									id="confirm-password"
									type={showPassword ? 'text' : 'password'}
									autoComplete="new-password"
									aria-invalid={errors.confirmPassword ? true : undefined}
									aria-describedby={errors.confirmPassword ? 'confirm-password-error' : undefined}
									className="h-11 rounded-lg"
									{...register('confirmPassword')}
								/>
								{errors.confirmPassword && (
									<p id="confirm-password-error" role="alert" className="text-xs font-medium text-destructive">
										{errors.confirmPassword.message}
									</p>
								)}
							</div>

							<div className="space-y-2 rounded-lg bg-slate-50 p-4 text-xs dark:bg-slate-950/50">
								<PasswordRequirement complete={passwordLongEnough}>De 8 a 64 caracteres</PasswordRequirement>
								<PasswordRequirement complete={passwordHasLetter}>Pelo menos uma letra</PasswordRequirement>
								<PasswordRequirement complete={passwordHasNumber}>Pelo menos um número</PasswordRequirement>
								<PasswordRequirement complete={passwordHasSymbol}>
									Pelo menos um caractere especial
								</PasswordRequirement>
								<PasswordRequirement complete={passwordsMatch}>As duas senhas são iguais</PasswordRequirement>
								<PasswordRequirement complete={passwordIsNew}>Diferente da senha atual</PasswordRequirement>
							</div>

							<Button type="submit" className="w-full rounded-lg sm:w-auto" loading={isSubmitting}>
								<LockKeyhole animateOnHover />
								Atualizar senha
							</Button>
						</div>
					</form>

					<div className="space-y-4 xl:border-l xl:border-slate-100 xl:pl-8 dark:xl:border-slate-800">
						<div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
							<div className="flex items-start gap-3">
								<MailCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
								<div className="min-w-0">
									<p className="text-sm font-semibold text-slate-900 dark:text-white">E-mail de acesso</p>
									<p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
								</div>
							</div>
						</div>

						<div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
							<div className="flex items-start gap-3">
								<Monitor className="mt-0.5 size-5 shrink-0 text-slate-500" />
								<div>
									<div className="flex items-center gap-2">
										<p className="text-sm font-semibold text-slate-900 dark:text-white">Sessão atual</p>
										<span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
											Ativa
										</span>
									</div>
									<p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
										Este navegador está conectado à sua conta.
									</p>
								</div>
							</div>
						</div>

						<p className="text-xs leading-5 text-slate-500 dark:text-slate-400">
							Esqueceu a senha atual?{' '}
							<Link
								href="/esqueci-senha"
								className="font-semibold text-violet-700 hover:underline dark:text-violet-300"
							>
								Redefina por e-mail
							</Link>
							.
						</p>
					</div>
				</div>
			</section>

			<section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-sm font-semibold text-slate-950 dark:text-white">Encerrar esta sessão</h2>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
							Você precisará entrar novamente para acessar sua conta.
						</p>
					</div>
					<Button type="button" variant="outline" className="rounded-lg sm:self-start" onClick={() => void onLogout()}>
						<LogOut />
						Sair da conta
					</Button>
				</div>
			</section>
		</div>
	);
}

function PasswordRequirement({ complete, children }: { complete: boolean; children: React.ReactNode }) {
	return (
		<p
			className={
				complete
					? 'flex items-center gap-2 text-emerald-700 dark:text-emerald-300'
					: 'flex items-center gap-2 text-slate-500 dark:text-slate-400'
			}
		>
			<span
				className={
					complete
						? 'flex size-4 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950'
						: 'flex size-4 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800'
				}
			>
				{complete ? <Check className="size-2.5" /> : <span className="size-1 rounded-full bg-current" />}
			</span>
			{children}
		</p>
	);
}
