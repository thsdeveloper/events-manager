'use client';

import { CalendarPlus, CheckCircle2, Clock3, MailCheck, Wallet } from 'lucide-react';
import Image from 'next/image';

const meanwhile = [
	{
		icon: MailCheck,
		title: 'Avisamos por e-mail',
		text: 'Assim que a análise terminar, você recebe uma mensagem e o painel aparece no seu perfil.',
	},
	{
		icon: CalendarPlus,
		title: 'Planeje o primeiro evento',
		text: 'Separe data, local, descrição e imagens: com o acesso liberado, a publicação leva minutos.',
	},
	{
		icon: Wallet,
		title: 'Tenha a chave PIX em mãos',
		text: 'É para ela que vão os repasses das vendas. Você cadastra no painel depois da liberação.',
	},
];

/**
 * Estado "em análise". Ocupa a largura do container, como o header, com o
 * cartão de status à esquerda e o que fazer enquanto isso à direita.
 */
export function StatusTimeline({ submittedAt = new Date() }: { submittedAt?: Date }) {
	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
			<section className="overflow-hidden rounded-lg border border-blue-200 bg-white shadow-sm dark:border-blue-900 dark:bg-slate-900">
				<div className="h-1.5 bg-gradient-to-r from-blue-500 to-violet-500" />
				<div className="p-6 sm:p-8">
					<div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
						<Clock3 className="size-6" aria-hidden="true" />
					</div>
					<p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-700 dark:text-blue-300">
						Conta de organizador
					</p>
					<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
						Cadastro em análise
					</h1>
					<p className="mt-3 text-base leading-7 text-slate-600 dark:text-slate-300">
						Recebido em {submittedAt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
						Você receberá uma atualização assim que a revisão terminar.
					</p>
					<div className="mt-6 flex gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
						<CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
						<div>
							<p className="font-semibold">Nenhuma configuração de gateway é necessária</p>
							<p className="mt-1 leading-6">
								A plataforma administra o processamento. Depois da aprovação, você cria eventos e cadastra uma chave PIX
								para os repasses.
							</p>
						</div>
					</div>
				</div>
			</section>

			<aside className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
				{/* Decorativa: duas pessoas revisando algo à mesa, a cena da análise em curso. */}
				<div className="mb-5 hidden justify-center lg:flex">
					<Image
						src="/images/organizer/reviewing.png"
						alt=""
						aria-hidden="true"
						width={442}
						height={486}
						sizes="260px"
						className="h-auto w-[240px]"
						priority={false}
					/>
				</div>
				<h2 className="font-semibold text-slate-950 dark:text-white">Enquanto isso</h2>
				<ul className="mt-4 space-y-4">
					{meanwhile.map((item) => {
						const Icon = item.icon;

						return (
							<li key={item.title} className="flex gap-3">
								<span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
									<Icon className="size-4" aria-hidden="true" />
								</span>
								<div>
									<p className="text-sm font-semibold text-slate-950 dark:text-white">{item.title}</p>
									<p className="mt-0.5 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.text}</p>
								</div>
							</li>
						);
					})}
				</ul>
			</aside>
		</div>
	);
}
