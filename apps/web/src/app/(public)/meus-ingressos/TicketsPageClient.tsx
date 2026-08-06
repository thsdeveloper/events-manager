'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, RefreshCw, Ticket } from 'lucide-react';
import type { EventRegistration } from '@events-manager/contracts';

import { MyTicketsContent } from '@/components/tickets/MyTicketsContent';
import { Button } from '@/components/ui/button';

export function TicketsPageClient() {
	const [registrations, setRegistrations] = useState<EventRegistration[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	const [reloadKey, setReloadKey] = useState(0);

	useEffect(() => {
		let isActive = true;

		async function loadTickets() {
			setIsLoading(true);
			setHasError(false);
			try {
				const response = await fetch('/api/user/tickets', { credentials: 'include' });
				if (!response.ok) throw new Error('Tickets unavailable');
				const data = (await response.json()) as EventRegistration[];
				if (isActive) setRegistrations(data);
			} catch {
				if (isActive) setHasError(true);
			} finally {
				if (isActive) setIsLoading(false);
			}
		}

		void loadTickets();

		return () => {
			isActive = false;
		};
	}, [reloadKey]);

	return (
		<div className="min-h-[calc(100vh-5rem)] border-y border-slate-100 bg-slate-50/80 px-4 py-10 dark:border-slate-900 dark:bg-slate-950 sm:px-6 lg:px-8">
			<div className="mx-auto max-w-7xl">
				<Link
					href="/perfil"
					className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-violet-700 dark:text-slate-400 dark:hover:text-violet-300"
				>
					<ArrowLeft className="size-4" />
					Voltar para minha conta
				</Link>
				<header className="mb-8 mt-5">
					<p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700 dark:text-violet-300">
						Sua atividade
					</p>
					<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
						Meus ingressos
					</h1>
					<p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
						Encontre os acessos dos seus próximos eventos e reveja experiências passadas.
					</p>
				</header>

				{isLoading ? (
					<div className="flex min-h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
						<div className="text-center">
							<Loader2 className="mx-auto size-6 animate-spin text-violet-600" />
							<p className="mt-3 text-sm text-slate-500">Carregando seus ingressos...</p>
						</div>
					</div>
				) : hasError ? (
					<div className="rounded-2xl border border-red-200 bg-white p-8 text-center dark:border-red-900 dark:bg-slate-900">
						<Ticket className="mx-auto size-8 text-red-400" />
						<h2 className="mt-4 font-semibold text-slate-950 dark:text-white">
							Não foi possível carregar seus ingressos
						</h2>
						<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Verifique sua conexão e tente novamente.</p>
						<Button
							type="button"
							variant="outline"
							className="mt-5 rounded-xl"
							onClick={() => setReloadKey((key) => key + 1)}
						>
							<RefreshCw />
							Tentar novamente
						</Button>
					</div>
				) : (
					<MyTicketsContent registrations={registrations} />
				)}
			</div>
		</div>
	);
}
