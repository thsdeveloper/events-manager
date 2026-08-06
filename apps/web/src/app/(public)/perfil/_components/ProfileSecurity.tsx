'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import {
	Check,
	Eye,
	EyeOff,
	KeyRound,
	Loader2,
	LockKeyhole,
	LogOut,
	MailCheck,
	Monitor,
	ShieldCheck,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import type { ProfileUser } from './types';

interface ProfileSecurityProps {
	user: ProfileUser;
	onLogout: () => Promise<void>;
}

export function ProfileSecurity({ user, onLogout }: ProfileSecurityProps) {
	const { toast } = useToast();
	const [newPassword, setNewPassword] = useState('');
	const [confirmation, setConfirmation] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState('');

	const passwordLongEnough = newPassword.length >= 8;
	const passwordsMatch = Boolean(newPassword) && newPassword === confirmation;

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!passwordLongEnough) {
			setError('A nova senha deve ter pelo menos 8 caracteres.');

			return;
		}
		if (!passwordsMatch) {
			setError('As senhas informadas não são iguais.');

			return;
		}

		setError('');
		setIsSaving(true);
		try {
			const response = await fetch('/api/user/password', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password: newPassword }),
			});
			if (!response.ok) throw new Error('Não foi possível alterar sua senha.');
			setNewPassword('');
			setConfirmation('');
			toast({
				title: 'Senha atualizada',
				description: 'Use a nova senha no seu próximo acesso.',
				variant: 'success',
			});
		} catch (submitError) {
			toast({
				title: 'Não foi possível alterar a senha',
				description: submitError instanceof Error ? submitError.message : 'Tente novamente em alguns instantes.',
				variant: 'destructive',
			});
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-6">
			<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
				<header className="border-b border-slate-100 px-6 py-5 dark:border-slate-800 sm:px-8 sm:py-6">
					<div className="flex items-start gap-3">
						<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
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
					<form onSubmit={handleSubmit}>
						<div className="flex items-center gap-2">
							<KeyRound className="size-4 text-slate-400" />
							<h2 className="text-sm font-semibold text-slate-900 dark:text-white">Criar nova senha</h2>
						</div>

						<div className="mt-5 space-y-5">
							<div className="space-y-2">
								<Label htmlFor="new-password">Nova senha</Label>
								<div className="relative">
									<Input
										id="new-password"
										type={showPassword ? 'text' : 'password'}
										value={newPassword}
										onChange={(event) => {
											setNewPassword(event.target.value);
											setError('');
										}}
										autoComplete="new-password"
										className="h-11 rounded-xl pr-11"
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
							</div>

							<div className="space-y-2">
								<Label htmlFor="confirm-password">Confirmar nova senha</Label>
								<Input
									id="confirm-password"
									type={showPassword ? 'text' : 'password'}
									value={confirmation}
									onChange={(event) => {
										setConfirmation(event.target.value);
										setError('');
									}}
									autoComplete="new-password"
									className="h-11 rounded-xl"
								/>
							</div>

							<div className="space-y-2 rounded-xl bg-slate-50 p-4 text-xs dark:bg-slate-950/50">
								<PasswordRequirement complete={passwordLongEnough}>Pelo menos 8 caracteres</PasswordRequirement>
								<PasswordRequirement complete={passwordsMatch}>As duas senhas são iguais</PasswordRequirement>
							</div>

							{error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

							<Button type="submit" className="w-full rounded-xl sm:w-auto" disabled={isSaving}>
								{isSaving ? <Loader2 className="animate-spin" /> : <LockKeyhole />}
								{isSaving ? 'Atualizando...' : 'Atualizar senha'}
							</Button>
						</div>
					</form>

					<div className="space-y-4 xl:border-l xl:border-slate-100 xl:pl-8 dark:xl:border-slate-800">
						<div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
							<div className="flex items-start gap-3">
								<MailCheck className="mt-0.5 size-5 shrink-0 text-emerald-600" />
								<div className="min-w-0">
									<p className="text-sm font-semibold text-slate-900 dark:text-white">E-mail de acesso</p>
									<p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
								</div>
							</div>
						</div>

						<div className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
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

			<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<h2 className="text-sm font-semibold text-slate-950 dark:text-white">Encerrar esta sessão</h2>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
							Você precisará entrar novamente para acessar sua conta.
						</p>
					</div>
					<Button type="button" variant="outline" className="rounded-xl sm:self-start" onClick={() => void onLogout()}>
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
