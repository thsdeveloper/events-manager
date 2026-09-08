'use client';

import { isProfileComplete } from '@events-manager/contracts';
import { BadgePercent, CalendarPlus, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Container from '@/components/ui/container';
import { OrganizerSignupForm } from '@/features/organizer-signup';
import { useServerAuth } from '@/hooks/useServerAuth';

const nextSteps = [
	{
		icon: ShieldCheck,
		title: 'Conta criada na hora',
		text: 'Pessoa física usa o CPF já validado; empresa informa o CNPJ. Nada de documentos para enviar.',
	},
	{
		icon: CalendarPlus,
		title: 'Publique o primeiro evento',
		text: 'Informações, ingressos, local e imagens em um fluxo guiado.',
	},
	{
		icon: Wallet,
		title: 'Receba pelos ingressos',
		text: 'Cadastre uma chave PIX e acompanhe cada repasse no painel.',
	},
];

export default function NovoOrganizadorPage() {
	const router = useRouter();
	const { user, isLoading, isOrganizer, hasPendingOrganizerRequest, organizerStatus, refresh } = useServerAuth();
	const profileComplete = user ? isProfileComplete(user) : false;
	// Regra de negócio: uma conta de organizador por pessoa, em qualquer status.
	const alreadyHasOrganizer = isOrganizer || hasPendingOrganizerRequest || Boolean(organizerStatus);

	useEffect(() => {
		if (isLoading) return;
		if (!user) {
			router.replace('/login?redirect=/perfil/organizador/novo');
		} else if (alreadyHasOrganizer || !profileComplete) {
			// A página do organizador explica o status atual ou o que falta no perfil.
			router.replace('/perfil/organizador');
		}
	}, [isLoading, user, alreadyHasOrganizer, profileComplete, router]);

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center" role="status">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 size-10 animate-spin text-primary" aria-hidden="true" />
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</div>
		);
	}

	if (!user || alreadyHasOrganizer || !profileComplete) return null;

	return (
		<Container as="section" className="py-8 lg:py-12">
			<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
				<div className="min-w-0">
					<header className="mb-8 max-w-2xl">
						<p className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
							Organizador
						</p>
						<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
							Crie sua conta de organizador
						</h1>
						<p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
							Escolha se vai vender como pessoa física ou como empresa. Já preenchemos o que sabemos sobre você; confira
							e ajuste o que quiser.
						</p>
					</header>
					<OrganizerSignupForm
						user={user}
						onSuccess={() => {
							refresh();
							router.push('/perfil/organizador');
						}}
					/>
				</div>

				<aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
					<div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
						<h2 className="font-semibold text-slate-950 dark:text-white">O que acontece depois</h2>
						<ol className="mt-4 space-y-4">
							{nextSteps.map((step, index) => {
								const Icon = step.icon;

								return (
									<li key={step.title} className="flex gap-3">
										<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
											<Icon className="size-4" aria-hidden="true" />
										</span>
										<div>
											<p className="text-sm font-semibold text-slate-950 dark:text-white">
												{index + 1}. {step.title}
											</p>
											<p className="mt-0.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.text}</p>
										</div>
									</li>
								);
							})}
						</ol>
					</div>
					<div className="rounded-lg border border-violet-200 bg-violet-50 p-5 dark:border-violet-900 dark:bg-violet-950/30">
						<div className="flex items-center gap-2 font-semibold text-violet-900 dark:text-violet-100">
							<BadgePercent className="size-4" aria-hidden="true" />
							CPF ou CNPJ vendem do mesmo jeito
						</div>
						<p className="mt-2 text-sm leading-6 text-violet-900/80 dark:text-violet-100/80">
							As taxas, o checkout com PIX e cartão e os repasses são iguais para os dois tipos de conta. A diferença é
							só em nome de quem os ingressos são vendidos.
						</p>
					</div>
				</aside>
			</div>
		</Container>
	);
}
