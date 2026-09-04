'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ExternalLink, Loader2, Mail, RefreshCw, ShieldCheck } from 'lucide-react';
import { AuthLayout } from '@/components/auth/AuthLayout';
import { httpClient } from '@/lib/http-client';
import { useToast } from '@/hooks/use-toast';

interface ConfirmEmailFormProps {
	initialEmail: string;
}

interface ConfirmationResponse {
	success: boolean;
	redirect: string;
}

export function ConfirmEmailForm({ initialEmail }: ConfirmEmailFormProps) {
	const { toast } = useToast();
	const [email, setEmail] = useState(initialEmail);
	const [token, setToken] = useState('');
	const [isConfirming, setIsConfirming] = useState(false);
	const [isResending, setIsResending] = useState(false);
	const [resendCooldown, setResendCooldown] = useState(initialEmail ? 60 : 0);

	useEffect(() => {
		if (resendCooldown <= 0) return;
		const timer = window.setTimeout(() => setResendCooldown((current) => Math.max(0, current - 1)), 1000);

		return () => window.clearTimeout(timer);
	}, [resendCooldown]);

	const handleConfirm = async (event: React.FormEvent) => {
		event.preventDefault();

		if (token.length !== 6) {
			toast({ title: 'Digite os 6 dígitos do código recebido por e-mail.', variant: 'destructive' });

			return;
		}

		setIsConfirming(true);
		try {
			// `httpClient` raises the failure as a toast on its own; the catch only
			// has to stop the pending state.
			const data = await httpClient.post<ConfirmationResponse>('/api/auth/register/confirm', { email, token });
			window.location.href = data.redirect || '/perfil';
		} catch {
			setIsConfirming(false);
		}
	};

	const handleResend = async () => {
		setIsResending(true);

		try {
			await httpClient.post('/api/auth/register/resend', { email });
			toast({ title: 'Um novo código foi enviado para o seu e-mail.', variant: 'success' });
			setResendCooldown(60);
		} catch {
			// Already surfaced by the http client's error toast.
		} finally {
			setIsResending(false);
		}
	};

	return (
		<AuthLayout title="Confirme seu e-mail" subtitle="Digite o código de 6 dígitos enviado pelo Supabase">
			<div className="space-y-6">
				<div className="flex items-start gap-3 rounded-lg border border-[#6644ff]/20 bg-[#6644ff]/5 p-4 dark:bg-[#6644ff]/10">
					<ShieldCheck className="mt-0.5 size-5 flex-shrink-0 text-[#6644ff]" />
					<p className="text-sm leading-relaxed text-gray-600 dark:text-gray-300">
						Sua conta só será liberada depois que o código for confirmado. Verifique também a caixa de spam.
					</p>
				</div>

				<form onSubmit={handleConfirm} className="space-y-5">
					<div className="space-y-2">
						<label htmlFor="confirmation-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							E-mail do cadastro
						</label>
						<div className="relative">
							<Mail className="pointer-events-none absolute inset-y-0 left-4 my-auto size-5 text-gray-400" />
							<input
								id="confirmation-email"
								type="email"
								value={email}
								onChange={(event) => setEmail(event.target.value)}
								required
								autoComplete="email"
								className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-[#6644ff] dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
								placeholder="seu@email.com"
							/>
						</div>
					</div>

					<div className="space-y-2">
						<label htmlFor="confirmation-token" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
							Código de confirmação
						</label>
						<input
							id="confirmation-token"
							type="text"
							value={token}
							onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
							required
							inputMode="numeric"
							pattern="[0-9]{6}"
							maxLength={6}
							autoComplete="one-time-code"
							autoFocus
							aria-describedby="confirmation-token-help"
							className="w-full rounded-lg border border-gray-300 bg-white p-4 text-center font-mono text-3xl font-bold tracking-[0.45em] text-gray-900 transition-all focus:border-transparent focus:ring-2 focus:ring-[#6644ff] dark:border-gray-600 dark:bg-gray-800/50 dark:text-white"
							placeholder="000000"
						/>
						<p id="confirmation-token-help" className="text-xs text-gray-500 dark:text-gray-400">
							O código expira em 15 minutos.
						</p>
					</div>

					<button
						type="submit"
						disabled={isConfirming}
						aria-busy={isConfirming || undefined}
						className="relative inline-flex w-full items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#6644ff] to-[#8b5cf6] px-6 py-3.5 font-semibold text-white shadow-lg shadow-[#6644ff]/20 transition-all hover:from-[#5533ee] hover:to-[#7c3aed] focus:ring-4 focus:ring-[#6644ff]/20 disabled:cursor-not-allowed disabled:opacity-50"
					>
						{isConfirming && (
							<span className="absolute inset-0 flex items-center justify-center">
								<Loader2 aria-hidden="true" className="size-5 animate-spin" />
							</span>
						)}
						<span className={`inline-flex items-center gap-2 ${isConfirming ? 'invisible' : ''}`}>
							<ShieldCheck className="size-5" />
							Confirmar e-mail
						</span>
					</button>
				</form>

				<div className="text-center text-sm text-gray-600 dark:text-gray-400">
					Não recebeu o código?{' '}
					<button
						type="button"
						onClick={handleResend}
						disabled={isResending || resendCooldown > 0 || !email}
						className="inline-flex items-center gap-1 font-semibold text-[#6644ff] transition-colors hover:text-[#5533ee] disabled:cursor-not-allowed disabled:text-gray-400"
					>
						<RefreshCw className={`size-4 ${isResending ? 'animate-spin' : ''}`} />
						{resendCooldown > 0 ? `Reenviar em ${resendCooldown}s` : 'Reenviar código'}
					</button>
				</div>

				{process.env.NODE_ENV === 'development' && (
					<a
						href="http://localhost:55324/"
						target="_blank"
						rel="noreferrer"
						className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-[#6644ff] hover:text-[#6644ff] dark:border-gray-700 dark:text-gray-400"
					>
						Abrir e-mail no Mailpit
						<ExternalLink className="size-4" />
					</a>
				)}

				<p className="text-center text-sm text-gray-500 dark:text-gray-400">
					E-mail incorreto?{' '}
					<Link href="/register" className="font-semibold text-[#6644ff] hover:text-[#5533ee]">
						Voltar ao cadastro
					</Link>
				</p>
			</div>
		</AuthLayout>
	);
}
