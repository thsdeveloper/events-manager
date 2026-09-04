'use client';

import { useEffect, useState } from 'react';
import { BadgeCheck, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isValidPhone } from '@/lib/br-documents';
import type { ProfileUser } from './types';

interface PhoneVerificationProps {
	/** Digits of the phone currently in the form. */
	phone: string;
	/** The saved phone is confirmed and the form still shows that same number. */
	verified: boolean;
	onVerified: (user: ProfileUser) => void;
}

interface Problem {
	detail?: string;
	context?: { field?: string };
}

async function readProblem(response: Response, fallback: string): Promise<Problem> {
	const problem = (await response.json().catch(() => null)) as Problem | null;

	return { detail: problem?.detail || fallback, context: problem?.context };
}

/**
 * Confirmação por SMS pelo Supabase Auth: um pedido envia o código para o
 * número que está no formulário; a confirmação grava telefone e data no perfil.
 * Reenviar é um novo pedido, com o intervalo mínimo que o provedor impõe.
 */
export function PhoneVerification({ phone, verified, onVerified }: PhoneVerificationProps) {
	const [step, setStep] = useState<'idle' | 'code'>('idle');
	const [token, setToken] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [isBusy, setIsBusy] = useState(false);
	const [cooldown, setCooldown] = useState(0);

	// Editing the number invalidates any code in flight.
	useEffect(() => {
		setStep('idle');
		setToken('');
		setError(null);
	}, [phone]);

	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = window.setTimeout(() => setCooldown((current) => current - 1), 1000);

		return () => window.clearTimeout(timer);
	}, [cooldown]);

	if (verified) {
		return (
			<p className="flex h-11 shrink-0 items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
				<BadgeCheck className="size-4" aria-hidden="true" />
				Telefone confirmado
			</p>
		);
	}

	const requestCode = async () => {
		setIsBusy(true);
		setError(null);
		try {
			const response = await fetch('/api/user/phone/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone }),
			});
			if (!response.ok) {
				const problem = await readProblem(response, 'Não foi possível enviar o código.');
				setError(problem.detail ?? null);

				return;
			}
			setStep('code');
			setCooldown(60);
		} finally {
			setIsBusy(false);
		}
	};

	const confirmCode = async () => {
		if (token.length !== 6) {
			setError('Digite os 6 dígitos do código recebido por SMS.');

			return;
		}
		setIsBusy(true);
		setError(null);
		try {
			const response = await fetch('/api/user/phone/confirm', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ phone, token }),
			});
			if (!response.ok) {
				const problem = await readProblem(response, 'Código inválido ou expirado.');
				setError(problem.detail ?? null);

				return;
			}
			const result = (await response.json()) as { user: ProfileUser };
			onVerified(result.user);
		} finally {
			setIsBusy(false);
		}
	};

	// Rendered as siblings of the phone field inside a wrapping flex row: the
	// trigger sits beside the field; the code panel and errors take a full row.
	return (
		<>
			{step === 'idle' ? (
				<Button
					type="button"
					variant="outline"
					className="h-11 shrink-0 rounded-lg"
					disabled={!isValidPhone(phone) || isBusy}
					onClick={requestCode}
				>
					<MessageSquareText className="size-4" aria-hidden="true" />
					Confirmar por SMS
				</Button>
			) : (
				<div className="basis-full rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/40">
					<Label htmlFor="phone-verification-code" className="text-slate-700 dark:text-slate-200">
						Código recebido por SMS
					</Label>
					<div className="mt-2 flex flex-col gap-2 sm:flex-row">
						<Input
							id="phone-verification-code"
							value={token}
							onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							placeholder="000000"
							aria-invalid={Boolean(error)}
							className="h-11 max-w-[12rem] rounded-lg text-center font-mono text-lg tracking-[0.4em]"
						/>
						<Button type="button" className="rounded-lg" disabled={isBusy} onClick={confirmCode}>
							Confirmar código
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="rounded-lg"
							disabled={isBusy || cooldown > 0}
							onClick={requestCode}
						>
							{cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
						</Button>
					</div>
					<p className="mt-2 text-xs text-slate-500 dark:text-slate-400">O código expira em 15 minutos.</p>
				</div>
			)}
			{error ? (
				<p role="alert" className="basis-full text-xs text-red-600 dark:text-red-400">
					{error}
				</p>
			) : null}
		</>
	);
}
