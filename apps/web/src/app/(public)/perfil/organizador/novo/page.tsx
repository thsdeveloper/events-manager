'use client';

import { isProfileComplete } from '@events-manager/contracts';
import { BadgePercent, CalendarPlus, Loader2, ShieldCheck, Wallet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useEffect } from 'react';
import Container from '@/components/ui/container';
import { OrganizerSignupForm } from '@/features/organizer-signup';
import { useServerAuth } from '@/hooks/useServerAuth';

const nextSteps = [
	{
		icon: ShieldCheck,
		title: 'Cadastre sua conta',
		text: 'Use o CPF validado no perfil ou o CNPJ da empresa. Após a aprovação, a conta estará disponível no workspace.',
	},
	{
		icon: CalendarPlus,
		title: 'Valide seus dados',
		text: 'Anexe os documentos do responsável, da empresa e da conta para análise.',
	},
	{
		icon: Wallet,
		title: 'Receba pelos ingressos',
		text: 'Escolha PIX ou conta bancária, envie documentos e acompanhe a aprovação.',
	},
];

export default function NovoOrganizadorPage() {
	const router = useRouter();
	const { user, isLoading, isOrganizer, hasPendingOrganizerRequest, organizerStatus, refresh } = useServerAuth();
	const profileComplete = user ? isProfileComplete(user) : false;
	const alreadyHasOrganizer = isOrganizer || hasPendingOrganizerRequest || Boolean(organizerStatus);

	useEffect(() => {
		if (isLoading) return;
		if (!user) {
			router.replace('/login?redirect=/perfil/organizador/novo');
		} else if (!profileComplete) {
			// A página do organizador explica o status atual ou o que falta no perfil.
			router.replace('/perfil/organizador');
		}
	}, [isLoading, user, profileComplete, router]);

	if (isLoading) {
		return (
			<div className="flex min-h-[60vh] items-center justify-center" role="status">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 size-10 animate-spin text-link" aria-hidden="true" />
					<p className="text-muted-foreground">Carregando...</p>
				</div>
			</div>
		);
	}

	if (!user || !profileComplete) return null;

	return (
		<Container as="section" className="py-8 lg:py-12">
			<div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
				<div className="min-w-0">
					<header className="mb-8 max-w-2xl">
						{isOrganizer && (
							<Button asChild variant="link" className="mb-4 h-auto p-0">
								<Link href="/admin/dashboard">Voltar ao workspace</Link>
							</Button>
						)}
						<p className="text-sm font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
							Organizador
						</p>
						<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
							{alreadyHasOrganizer ? 'Cadastre uma nova conta de organizador' : 'Crie sua conta de organizador'}
						</h1>
						<p className="mt-3 text-base leading-7 text-muted-foreground">
							Escolha se vai vender como pessoa física ou como empresa. Pessoa física vende com os dados já validados no
							seu perfil; empresa informa os dados da organização e o CNPJ.
						</p>
					</header>
					<OrganizerSignupForm
						user={user}
						initialAccountType={alreadyHasOrganizer ? 'company' : 'individual'}
						onSuccess={async (organizerId) => {
							const destination = organizerId
								? `/perfil/organizador/${organizerId}/recebimento`
								: '/perfil/organizador/recebimento';
							await refresh();
							router.push(destination);
							router.refresh();
						}}
					/>
				</div>

				<aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
					<div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
						<h2 className="font-semibold text-foreground">O que acontece depois</h2>
						<ol className="mt-4 space-y-4">
							{nextSteps.map((step, index) => {
								const Icon = step.icon;

								return (
									<li key={step.title} className="flex gap-3">
										<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300">
											<Icon className="size-4" aria-hidden="true" />
										</span>
										<div>
											<p className="text-sm font-semibold text-foreground">
												{index + 1}. {step.title}
											</p>
											<p className="mt-0.5 text-sm leading-6 text-muted-foreground">{step.text}</p>
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
