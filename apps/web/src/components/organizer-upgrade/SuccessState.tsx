'use client';

import { ArrowRight, CalendarDays, ChartNoAxesCombined, CheckCircle2, Settings2, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

const nextSteps = [
	{
		title: 'Crie seu primeiro evento',
		description: 'Defina data, local, lotes e publicação.',
		href: '/admin/eventos/novo',
		icon: CalendarDays,
	},
	{
		title: 'Configure sua organização',
		description: 'Revise identidade, contato e a chave PIX dos repasses.',
		href: '/admin/configuracoes',
		icon: Settings2,
	},
	{
		title: 'Acompanhe o financeiro',
		description: 'Veja vendas, taxas, saldo e repasses por evento.',
		href: '/admin/financeiro',
		icon: WalletCards,
	},
];

/**
 * Boas-vindas de quem acabou de ter a conta liberada. Ocupa a largura do
 * container, como o header, em vez de uma coluna centralizada mais estreita.
 */
export function SuccessState({ organizerName = 'Organizador' }: { organizerName?: string }) {
	return (
		<div className="space-y-6">
			<section className="relative rounded-lg border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 p-6 shadow-sm dark:border-emerald-900 dark:from-emerald-950/40 dark:via-slate-950 dark:to-violet-950/30 sm:p-10">
				{/* Decorativa: a caixa com confete vaza a borda do cartão, como um pacote sendo aberto. */}
				<img
					src="/images/organizer/celebration.svg"
					alt=""
					aria-hidden="true"
					width={1000}
					height={1000}
					className="pointer-events-none absolute -right-6 -top-12 hidden w-[340px] lg:block xl:w-[380px]"
				/>
				<div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-center">
					<div className="max-w-2xl">
						<div className="mb-5 flex size-12 items-center justify-center rounded-lg bg-emerald-600 text-white">
							<CheckCircle2 className="size-6" aria-hidden="true" />
						</div>
						<p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700 dark:text-emerald-300">
							Conta liberada
						</p>
						<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
							Tudo pronto, {organizerName}.
						</h1>
						<p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
							Sua conta de organizador está ativa. Você já pode publicar eventos, vender ingressos e acompanhar toda a
							operação no painel.
						</p>
						<div className="mt-7 flex flex-col gap-3 sm:flex-row">
							<Button size="lg" asChild>
								<Link href="/admin/eventos/novo">
									Criar evento
									<ArrowRight aria-hidden="true" />
								</Link>
							</Button>
							<Button size="lg" variant="outline" asChild>
								<Link href="/admin/dashboard">
									<ChartNoAxesCombined aria-hidden="true" />
									Abrir painel
								</Link>
							</Button>
						</div>
					</div>
				</div>
			</section>

			<ol className="grid gap-4 md:grid-cols-3" aria-label="Próximos passos">
				{nextSteps.map((step, index) => {
					const Icon = step.icon;

					return (
						<li
							key={step.href}
							className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm transition-colors hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-700"
						>
							<div className="flex items-center justify-between">
								<div className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
									<Icon className="size-5" aria-hidden="true" />
								</div>
								<span className="text-xs font-semibold text-slate-400">0{index + 1}</span>
							</div>
							<h2 className="mt-5 font-semibold text-slate-950 dark:text-white">{step.title}</h2>
							<p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.description}</p>
							<Link
								className="mt-5 inline-flex items-center text-sm font-semibold text-violet-700 hover:text-violet-900 dark:text-violet-300"
								href={step.href}
							>
								Começar
								<ArrowRight className="ml-1.5 size-4" aria-hidden="true" />
							</Link>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
