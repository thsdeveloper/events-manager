'use client';

import { useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { AppUser } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { describeProblem } from '@/lib/problem';

export function MissingEmailVerification({ email, onVerified }: { email: string; onVerified(user: AppUser): void }) {
	const [sent, setSent] = useState(false);
	const [token, setToken] = useState('');
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [cooldown, setCooldown] = useState(0);
	const currentEmail = useRef(email);
	useEffect(() => {
		currentEmail.current = email;
		setSent(false);
		setToken('');
		setError(null);
	}, [email]);
	useEffect(() => {
		if (cooldown <= 0) return;
		const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);

		return () => window.clearTimeout(timer);
	}, [cooldown]);
	async function send(confirm = false) {
		setBusy(true);
		setError(null);
		try {
			const response = await fetch(`/api/user/email/${confirm ? 'confirm' : 'request'}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ email: email.trim(), ...(confirm ? { token } : {}) }),
			});
			const result = await response.json();
			if (currentEmail.current !== email) return;
			if (!response.ok) throw new Error(describeProblem(result, 'Não foi possível confirmar seu e-mail.'));
			if (confirm) onVerified(result.user);
			else {
				setSent(true);
				setCooldown(60);
			}
		} catch (cause) {
			if (currentEmail.current === email)
				setError(
					cause instanceof Error && !(cause instanceof TypeError)
						? cause.message
						: 'Não foi possível confirmar seu e-mail. Verifique sua conexão e tente novamente.',
				);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-3">
			{sent ? (
				<div className="space-y-2 rounded-lg border bg-background p-3">
					<Label htmlFor="checkout-email-code">Código recebido por e-mail</Label>
					<Input
						id="checkout-email-code"
						autoComplete="one-time-code"
						inputMode="numeric"
						maxLength={6}
						value={token}
						onChange={(event) => setToken(event.target.value.replace(/\D/g, '').slice(0, 6))}
					/>
					<div className="flex flex-wrap gap-2">
						<Button type="button" disabled={busy || token.length !== 6} onClick={() => void send(true)}>
							Validar e-mail
						</Button>
						<Button type="button" variant="ghost" disabled={busy || cooldown > 0} onClick={() => void send()}>
							{cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar código'}
						</Button>
					</div>
				</div>
			) : (
				<Button
					type="button"
					variant="outline"
					disabled={busy || !z.string().email().safeParse(email.trim()).success}
					onClick={() => void send()}
				>
					Confirmar e-mail
				</Button>
			)}
			{error ? (
				<p role="alert" className="text-sm text-destructive">
					{error}
				</p>
			) : null}
		</div>
	);
}
