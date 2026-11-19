'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
export function AcceptInvitation({
	email,
	scope = 'organization',
}: {
	email?: string;
	scope?: 'organization' | 'platform';
}) {
	const platform = scope === 'platform';
	const storageKey = platform ? 'flouvi.platform.invitation' : 'flouvi.iam.invitation';
	const acceptPath = platform ? '/convites/plataforma' : '/convites/aceitar';
	const router = useRouter();
	const [token, setToken] = useState<string | null>(null);
	const [ready, setReady] = useState(false);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	useEffect(() => {
		const fragment = new URLSearchParams(location.hash.slice(1)).get('token');
		const candidate = fragment ?? sessionStorage.getItem(storageKey);
		if (candidate && /^[A-Za-z0-9_-]{43}$/.test(candidate)) {
			sessionStorage.setItem(storageKey, candidate);
			setToken(candidate);
		}
		if (location.hash) history.replaceState(null, '', location.pathname);
		setReady(true);
	}, [storageKey]);
	async function accept() {
		if (!token) return;
		setBusy(true);
		setError('');
		try {
			const response = await fetch(platform ? '/api/platform-iam/invitations/accept' : '/api/iam/invitations/accept', {
				method: 'POST',
				credentials: 'include',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ token }),
			});
			const result = await response.json();
			if (!response.ok) throw new Error(result.detail ?? 'Não foi possível aceitar o convite.');
			sessionStorage.removeItem(storageKey);
			toast({ title: 'Convite aceito. Bem-vindo à equipe!' });
			router.replace(platform ? '/super-admin' : '/admin');
			router.refresh();
		} catch (cause) {
			const message = cause instanceof Error ? cause.message : 'Tente novamente.';
			setError(message);
			toast({ title: 'Convite não aceito', description: message, variant: 'destructive' });
		} finally {
			setBusy(false);
		}
	}

	return (
		<main className="mx-auto max-w-lg space-y-5 rounded-xl border bg-card p-8 shadow-sm">
			<ShieldCheck className="size-10 text-primary" />
			<h1 className="text-2xl font-semibold">Faça parte da equipe</h1>
			<p className="text-muted-foreground">
				{platform
					? 'O convite concede acesso à administração da plataforma, limitado aos módulos e permissões definidos pelo responsável.'
					: 'O convite concede acesso à organização de acordo com os cargos e eventos definidos pelo responsável.'}
			</p>
			{!ready ? (
				<p>Carregando convite…</p>
			) : !token ? (
				<p role="alert">Abra o link do convite recebido por e-mail para continuar.</p>
			) : (
				<>
					{email ? (
						<>
							<p className="text-sm">
								Você está conectado como <strong>{email}</strong>. Use a conta que recebeu o convite, com o e-mail
								confirmado.
							</p>
							<Button disabled={busy} onClick={accept}>
								{busy ? 'Aceitando…' : 'Aceitar convite'}
							</Button>
						</>
					) : (
						<>
							<p className="text-sm">Entre com o mesmo e-mail que recebeu o convite.</p>
							<Button asChild>
								<Link href={`/login?redirect=${encodeURIComponent(acceptPath)}`}>Entrar para aceitar</Link>
							</Button>
							<p className="text-sm">
								<Link className="text-primary underline" href="/register">
									Criar uma conta
								</Link>
								. Após confirmar seu e-mail, abra novamente este convite.
							</p>
						</>
					)}
					{error && (
						<p role="alert" className="text-sm text-destructive">
							{error}
						</p>
					)}
				</>
			)}
		</main>
	);
}
