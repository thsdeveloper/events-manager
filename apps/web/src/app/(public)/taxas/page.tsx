import type { Metadata } from 'next';
import { ArrowRight, BadgePercent, CalendarOff, CreditCard, Landmark, QrCode, Sparkles, Wallet } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { FeeCalculator } from '@/features/fees';

export const metadata: Metadata = {
	title: 'Taxas e calculadora de custos',
	description:
		'Veja exatamente quanto custa vender ingressos na plataforma: taxa de serviço, tarifas por forma de pagamento e quanto sobra para você em cada ingresso.',
};

const promises = [
	{ icon: CalendarOff, label: 'Sem mensalidade' },
	{ icon: Wallet, label: 'Repasse na sua chave PIX' },
	{ icon: Sparkles, label: 'Você escolhe quem paga a taxa' },
];

const steps = [
	{
		title: 'Defina o preço do ingresso',
		detail:
			'Você anuncia o valor que quiser. A taxa de serviço é um percentual fixo sobre esse valor, sem faixas escondidas.',
	},
	{
		title: 'Escolha quem paga a taxa de serviço',
		detail: 'Repasse ao comprador e receba o valor cheio, ou absorva a taxa para manter o preço redondo na divulgação.',
	},
	{
		title: 'Receba na sua chave PIX',
		detail: 'O valor das vendas vai para a chave PIX cadastrada, descontadas apenas as tarifas que estão na tabela.',
	},
];

const paymentOptions = [
	{ icon: QrCode, title: 'PIX', detail: 'Aprovação na hora e a menor tarifa da tabela.' },
	{
		icon: CreditCard,
		title: 'Cartão',
		detail: 'À vista ou em até 12 vezes, com a tarifa de cada faixa exibida abaixo.',
	},
	{ icon: Landmark, title: 'Boleto', detail: 'Para quem prefere pagar sem cartão, com tarifa fixa por transação.' },
];

export default function TaxasPage() {
	return (
		<Container as="section" className="py-10 sm:py-14">
			<header className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-emerald-50 px-6 py-10 dark:border-violet-900/60 dark:from-violet-950/40 dark:via-slate-900 dark:to-emerald-950/30 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12">
				<div className="max-w-2xl">
					<p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
						<BadgePercent className="size-4" aria-hidden="true" />
						Transparência total
					</p>
					<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl lg:text-5xl">
						Quanto você paga de taxas
					</h1>
					<p className="mt-4 text-base leading-7 text-slate-600 dark:text-slate-300">
						Sem mensalidade, sem fidelidade e sem surpresa no repasse. Informe o valor do ingresso, escolha quem paga a
						taxa de serviço e a forma de pagamento do comprador para ver o valor exato que sobra para você.
					</p>
					<ul className="mt-6 flex flex-wrap gap-2">
						{promises.map(({ icon: Icon, label }) => (
							<li
								key={label}
								className="flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
							>
								<Icon className="size-3.5 text-violet-600 dark:text-violet-300" aria-hidden="true" />
								{label}
							</li>
						))}
					</ul>
				</div>

				{/* Decorativa: a dupla segurando a seta de crescimento sobre as moedas
				    resume a promessa da página, ver quanto sobra e crescer com isso. */}
				<div className="relative mx-auto mt-10 w-fit lg:mt-0">
					<div
						className="absolute inset-x-6 bottom-2 top-10 rounded-full bg-violet-200/70 blur-2xl dark:bg-violet-700/30"
						aria-hidden="true"
					/>
					<img
						src="/images/fees/growth.webp"
						alt=""
						aria-hidden="true"
						width={318}
						height={368}
						decoding="async"
						className="relative h-52 w-auto drop-shadow-xl sm:h-64 lg:h-72"
					/>
				</div>
			</header>

			<section
				aria-labelledby="fee-steps-heading"
				className="mt-10 grid gap-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8 lg:grid-cols-[auto_minmax(0,1fr)] lg:items-center lg:gap-12"
			>
				{/* Decorativa: calculadora e gráficos, a mesma ideia da simulação logo abaixo. */}
				<div className="relative mx-auto w-fit">
					<div
						className="absolute inset-x-4 inset-y-6 rounded-full bg-sky-100 blur-2xl dark:bg-sky-900/40"
						aria-hidden="true"
					/>
					<img
						src="/images/fees/calculator.webp"
						alt=""
						aria-hidden="true"
						width={368}
						height={322}
						loading="lazy"
						decoding="async"
						className="relative h-40 w-auto drop-shadow-lg sm:h-48 lg:h-56"
					/>
				</div>
				<div>
					<h2 id="fee-steps-heading" className="font-heading text-2xl font-semibold text-slate-950 dark:text-white">
						Como a taxa funciona
					</h2>
					<ol aria-labelledby="fee-steps-heading" className="mt-6 space-y-5">
						{steps.map((step, index) => (
							<li key={step.title} className="flex gap-4">
								<span
									className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-semibold text-white shadow-sm dark:bg-violet-500"
									aria-hidden="true"
								>
									{index + 1}
								</span>
								<div>
									<p className="font-semibold text-slate-950 dark:text-white">{step.title}</p>
									<p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">{step.detail}</p>
								</div>
							</li>
						))}
					</ol>
				</div>
			</section>

			<div className="mt-10">
				<div className="mb-4 flex items-baseline justify-between gap-4">
					<h2 className="font-heading text-2xl font-semibold text-slate-950 dark:text-white">Simule seu evento</h2>
					<p className="hidden text-sm text-slate-500 dark:text-slate-400 sm:block">
						As mesmas contas do formulário de ingressos.
					</p>
				</div>
				<ReactQueryProvider>
					<FeeCalculator />
				</ReactQueryProvider>
			</div>

			<section
				aria-labelledby="buyers-heading"
				className="mt-10 grid gap-8 rounded-2xl border border-slate-200 bg-slate-50 p-6 dark:border-slate-800 dark:bg-slate-900/60 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-12"
			>
				<div>
					<h2 id="buyers-heading" className="font-heading text-2xl font-semibold text-slate-950 dark:text-white">
						Para quem compra
					</h2>
					<p className="mt-3 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-300">
						Seu público paga como preferir e vê o valor final antes de confirmar. As tarifas de cada forma valem para
						todos os eventos e são as mesmas da tabela acima.
					</p>
					<ul className="mt-6 grid gap-3 sm:grid-cols-3">
						{paymentOptions.map(({ icon: Icon, title, detail }) => (
							<li
								key={title}
								className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
							>
								<Icon className="size-5 text-violet-600 dark:text-violet-300" aria-hidden="true" />
								<p className="mt-3 font-semibold text-slate-950 dark:text-white">{title}</p>
								<p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{detail}</p>
							</li>
						))}
					</ul>
				</div>
				{/* Decorativa: o comprador com o cartão na mão, do lado de quem paga. */}
				<div className="relative mx-auto w-fit">
					<div
						className="absolute inset-x-6 inset-y-8 rounded-full bg-amber-100 blur-2xl dark:bg-amber-900/30"
						aria-hidden="true"
					/>
					<img
						src="/images/fees/buyer.webp"
						alt=""
						aria-hidden="true"
						width={368}
						height={340}
						loading="lazy"
						decoding="async"
						className="relative h-44 w-auto drop-shadow-lg sm:h-52 lg:h-60"
					/>
				</div>
			</section>

			<div className="mt-20 rounded-2xl bg-slate-950 px-6 py-8 text-white dark:bg-slate-900 sm:px-10 lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end lg:gap-10">
				<div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between lg:py-2">
					<div>
						<p className="text-lg font-semibold">Gostou das contas?</p>
						<p className="mt-1 text-sm text-slate-300">Crie sua conta de organizador e publique seu evento hoje.</p>
					</div>
					<Button asChild size="lg">
						<Link href="/perfil/organizador">
							Quero vender ingressos
							<ArrowRight aria-hidden="true" />
						</Link>
					</Button>
				</div>
				{/* Decorativa: o time sai por cima do cartão, como se já estivesse do lado de cá. */}
				<img
					src="/images/fees/team.webp"
					alt=""
					aria-hidden="true"
					width={338}
					height={368}
					loading="lazy"
					decoding="async"
					className="-mb-8 -mt-20 hidden h-64 w-auto drop-shadow-2xl lg:block"
				/>
			</div>
		</Container>
	);
}
