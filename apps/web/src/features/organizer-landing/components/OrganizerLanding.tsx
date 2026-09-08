'use client';

import { getProfileChecklist, isProfileComplete, type AppUser } from '@events-manager/contracts';
import {
	ArrowRight,
	BadgePercent,
	CalendarCheck2,
	ChartNoAxesCombined,
	Check,
	CircleDashed,
	ClipboardList,
	CreditCard,
	QrCode,
	Rocket,
	ShieldCheck,
	Sparkles,
	Ticket,
	UserRoundCheck,
	Wallet,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { FAQAccordion } from '@/components/organizer-upgrade/FAQAccordion';
import { Button } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { profileSectionHref } from '@/lib/profile-sections';
import { cn } from '@/lib/utils';

type LandingUser = AppUser & { email: string };

interface OrganizerLandingProps {
	user: LandingUser;
}

const REQUEST_HREF = '/perfil/organizador/novo';
const COMPLETE_PROFILE_HREF = profileSectionHref('personal');

const highlights = [
	{
		icon: BadgePercent,
		title: 'A menor taxa do mercado',
		text: 'Sem mensalidade, sem fidelidade e sem surpresa no repasse.',
	},
	{
		icon: CreditCard,
		title: 'PIX e cartão no checkout',
		text: 'Pagamento hospedado, parcelamento em ingressos elegíveis.',
	},
	{ icon: Wallet, title: 'Repasses rastreáveis', text: 'Chave PIX, status e histórico de cada repasse no painel.' },
	{ icon: QrCode, title: 'Check-in na porta', text: 'Lista de participantes, QR code e reenvio de confirmação.' },
];

const benefits = [
	{
		icon: Sparkles,
		title: 'Criação guiada',
		text: 'Informações, agenda, local, imagens e publicação em um fluxo passo a passo.',
	},
	{
		icon: Ticket,
		title: 'Controle de ingressos',
		text: 'Preços, períodos de venda, limites por compra e disponibilidade em tempo real.',
	},
	{
		icon: CreditCard,
		title: 'Checkout integrado',
		text: 'Venda com os meios do gateway da plataforma e estoque reservado no ato.',
	},
	{
		icon: UserRoundCheck,
		title: 'Gestão de participantes',
		text: 'Inscrições, edição de dados, check-in e reenvio individual de confirmação.',
	},
	{
		icon: ChartNoAxesCombined,
		title: 'Análises operacionais',
		text: 'Vendas, check-ins e desempenho de cada evento em painéis claros.',
	},
	{
		icon: ShieldCheck,
		title: 'Sessões protegidas',
		text: 'Autenticação por cookies seguros e autorização por perfil em toda operação.',
	},
];

/**
 * Landing de conversão para virar organizador. Segue o funil em três passos
 * (cadastro completo, criação da conta, publicação) e mostra, já no topo, em que
 * ponto a pessoa está: a regra de negócio é que só um cadastro completo pode
 * pedir acesso, então o CTA principal muda de destino conforme o caso.
 */
export function OrganizerLanding({ user }: OrganizerLandingProps) {
	const checklist = getProfileChecklist(user);
	const missing = checklist.filter((item) => !item.complete);
	const complete = isProfileComplete(user);
	const reduceMotion = useReducedMotion();
	const firstName = user.first_name?.trim() || 'você';

	const reveal = reduceMotion
		? {}
		: {
				initial: { opacity: 0, y: 16 },
				whileInView: { opacity: 1, y: 0 },
				viewport: { once: true, margin: '-40px' },
				transition: { duration: 0.35, ease: 'easeOut' as const },
			};

	return (
		<div className="bg-gradient-to-b from-violet-50/70 via-white to-white dark:from-slate-950 dark:via-slate-950 dark:to-slate-950">
			<Container as="section" className="py-10 sm:py-14 lg:py-16">
				{/* Hero */}
				<div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-14">
					<motion.div
						{...(reduceMotion
							? {}
							: { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.4 } })}
					>
						<h1 className="font-heading text-4xl font-semibold leading-[1.1] tracking-tight text-slate-950 dark:text-white sm:text-5xl lg:text-6xl">
							Venda ingressos e fique com{' '}
							<span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
								mais do seu dinheiro
							</span>
						</h1>
						<p className="mt-5 max-w-xl text-lg leading-8 text-slate-600 dark:text-slate-300">
							Publique seu evento em minutos, venda com PIX e cartão e acompanhe participantes, check-in e repasses no
							mesmo lugar. Tudo com a menor taxa por ingresso do mercado.
						</p>

						<ul className="mt-6 grid gap-2 sm:grid-cols-2">
							{[
								'Criação guiada do evento',
								'Checkout com PIX e cartão',
								'Painel de participantes e check-in',
								'Repasses com histórico',
							].map((item) => (
								<li key={item} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
									<span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
										<Check className="size-3" aria-hidden="true" />
									</span>
									{item}
								</li>
							))}
						</ul>

						<div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
							<PrimaryCta complete={complete} />
							<Button asChild variant="ghost" size="lg" className="rounded-lg">
								<a href="#como-funciona">
									Ver como funciona
									<ArrowRight className="size-4" aria-hidden="true" />
								</a>
							</Button>
						</div>
					</motion.div>

					{/* Decorativa: a organizadora à mesa, com o notebook aberto, é a cena do painel em uso. */}
					<motion.div
						{...(reduceMotion
							? {}
							: {
									initial: { opacity: 0, y: 20 },
									animate: { opacity: 1, y: 0 },
									transition: { duration: 0.5, delay: 0.1 },
								})}
						className="relative hidden lg:block"
					>
						<div
							aria-hidden="true"
							className="absolute inset-x-8 bottom-6 h-10 rounded-[100%] bg-violet-200/50 blur-2xl dark:bg-violet-900/30"
						/>
						<Image
							src="/images/organizer/hero.webp"
							alt=""
							aria-hidden="true"
							width={1400}
							height={1271}
							sizes="(min-width: 1280px) 520px, 40vw"
							priority
							className="relative ml-auto h-auto w-full max-w-[520px]"
						/>
					</motion.div>
				</div>

				<div className="mt-10">
					<ReadinessCard firstName={firstName} complete={complete} total={checklist.length} missing={missing} />
				</div>

				{/* Highlights */}
				<motion.ul
					{...reveal}
					className="mt-14 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
					aria-label="Destaques da plataforma"
				>
					{highlights.map(({ icon: Icon, title, text }) => (
						<li
							key={title}
							className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
						>
							<span className="flex size-9 items-center justify-center rounded-lg bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300">
								<Icon className="size-4" aria-hidden="true" />
							</span>
							<p className="mt-3 text-sm font-semibold text-slate-950 dark:text-white">{title}</p>
							<p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{text}</p>
						</li>
					))}
				</motion.ul>
			</Container>

			{/* How it works */}
			<Container as="section" className="py-10 sm:py-14" role="region">
				<div id="como-funciona" className="scroll-mt-24">
					<SectionHeading
						eyebrow="Como funciona"
						title="Três passos até a primeira venda"
						text="Você já está no caminho. Veja o que falta para publicar o seu evento."
					/>
					<ol aria-label="Como funciona" className="mt-8 grid gap-4 lg:grid-cols-3">
						<Step
							number={1}
							title="Complete seu cadastro"
							text="Nome, foto, CPF, telefone confirmado e onde você está. É o que vai nos comprovantes e repasses."
							state={complete ? 'done' : 'current'}
							action={
								complete ? null : (
									<Link
										href={COMPLETE_PROFILE_HREF}
										className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
									>
										Completar agora
									</Link>
								)
							}
						/>
						<Step
							number={2}
							title="Crie sua conta de organizador"
							text="Venda como pessoa física, com o CPF já validado, ou como empresa, com CNPJ. Leva menos de dois minutos."
							state={complete ? 'current' : 'upcoming'}
							action={
								complete ? (
									<Link
										href={REQUEST_HREF}
										className="text-sm font-semibold text-violet-700 hover:underline dark:text-violet-300"
									>
										Criar minha conta
									</Link>
								) : null
							}
						/>
						<Step
							number={3}
							title="Publique e venda"
							text="Com o acesso liberado, crie o evento, configure ingressos e acompanhe as vendas no painel."
							state="upcoming"
						/>
					</ol>
				</div>
			</Container>

			{/* Fees: a cor vai de ponta a ponta; o conteúdo fica no container do header. */}
			<section className="bg-[#3b1ef3] text-white">
				<Container className="py-12 sm:py-14 lg:py-16">
					<div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] lg:gap-10">
						<motion.div {...reveal}>
							<h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
								Quanto sobra para você em cada ingresso?
							</h2>
							<p className="mt-4 max-w-md text-sm leading-6 text-white/85">
								Informe o valor e escolha quem paga a taxa de serviço. A estimativa usa as taxas atuais da plataforma; a
								tarifa do gateway é confirmada na liquidação.
							</p>
							<Button asChild size="lg" className="mt-6 bg-white text-violet-700 hover:bg-violet-50">
								<Link href="/taxas">
									Calcular minhas taxas
									<ArrowRight aria-hidden="true" />
								</Link>
							</Button>
						</motion.div>
						{/* Decorativa: o cofre com dinheiro, em loop de cinco segundos; parado para quem prefere menos movimento. */}
						<div className="flex justify-center">
							<video
								src="/videos/organizer/safe.webm"
								poster="/videos/organizer/safe-poster.webp"
								autoPlay={!reduceMotion}
								muted
								loop
								playsInline
								preload="metadata"
								aria-hidden="true"
								width={1200}
								height={1200}
								className="h-auto w-full max-w-[320px] lg:max-w-[360px]"
							/>
						</div>
						<motion.p {...reveal} className="flex items-center gap-4 lg:justify-end">
							<span aria-hidden="true" className="font-heading text-7xl font-bold leading-none sm:text-8xl">
								%
							</span>
							<span className="font-heading text-3xl font-semibold leading-tight sm:text-4xl">
								<span className="sr-only">Taxa por ingresso </span>
								mais baixa do mercado
							</span>
						</motion.p>
					</div>
				</Container>
			</section>

			{/* Benefits */}
			<Container as="section" className="py-10 sm:py-14">
				<SectionHeading
					eyebrow="O que você recebe"
					title="Um painel completo, do rascunho ao repasse"
					text="Cada recurso abaixo já está incluído no acesso de organizador."
				/>
				<ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Recursos incluídos">
					{benefits.map(({ icon: Icon, title, text }, index) => (
						<motion.li
							key={title}
							{...(reduceMotion
								? {}
								: {
										initial: { opacity: 0, y: 16 },
										whileInView: { opacity: 1, y: 0 },
										viewport: { once: true, margin: '-40px' },
										transition: { duration: 0.35, delay: Math.min(index, 5) * 0.05, ease: 'easeOut' as const },
									})}
							className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-violet-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-violet-700"
						>
							<span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700 transition-colors group-hover:bg-violet-100 group-hover:text-violet-700 dark:bg-slate-800 dark:text-slate-200 dark:group-hover:bg-violet-950 dark:group-hover:text-violet-300">
								<Icon className="size-5" aria-hidden="true" />
							</span>
							<p className="mt-4 font-semibold text-slate-950 dark:text-white">{title}</p>
							<p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
						</motion.li>
					))}
				</ul>
			</Container>

			{/* FAQ */}
			<Container as="section" className="py-10 sm:py-14">
				<FAQAccordion />
			</Container>

			{/* Final CTA: o degradê vai de ponta a ponta; o conteúdo fica no container do header. */}
			<section className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-600 to-indigo-600 text-white">
				<div
					aria-hidden="true"
					className="pointer-events-none absolute inset-0 opacity-15"
					style={{
						backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
						backgroundSize: '28px 28px',
					}}
				/>
				<Container className="relative py-14 sm:py-20">
					<motion.div {...reveal} className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
						<div className="max-w-2xl">
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
								{complete ? 'Tudo pronto' : 'Quase lá'}
							</p>
							<h2 className="mt-2 font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
								{complete
									? 'Seu próximo evento começa agora.'
									: `Faltam só ${missing.length} ${missing.length === 1 ? 'item' : 'itens'} do seu cadastro.`}
							</h2>
							<p className="mt-3 text-white/85">
								{complete
									? 'Crie sua conta de organizador e, com o acesso liberado, publique o evento e comece a vender.'
									: 'Complete o cadastro e volte aqui: criar a conta leva menos de dois minutos.'}
							</p>
						</div>
						<PrimaryCta complete={complete} tone="inverted" />
					</motion.div>
				</Container>
			</section>
		</div>
	);
}

function PrimaryCta({ complete, tone = 'brand' }: { complete: boolean; tone?: 'brand' | 'inverted' }) {
	const className = cn(
		'h-12 rounded-lg px-6 text-base font-semibold shadow-lg transition-transform hover:-translate-y-0.5 motion-reduce:transform-none',
		tone === 'inverted' && 'bg-white text-violet-700 hover:bg-violet-50',
	);

	return complete ? (
		<Button asChild size="lg" className={className}>
			<Link href={REQUEST_HREF}>
				<Rocket className="size-5" aria-hidden="true" />
				Quero vender ingressos
			</Link>
		</Button>
	) : (
		<Button asChild size="lg" className={className}>
			<Link href={COMPLETE_PROFILE_HREF}>
				<ClipboardList className="size-5" aria-hidden="true" />
				Completar meu cadastro
			</Link>
		</Button>
	);
}

function ReadinessCard({
	firstName,
	complete,
	total,
	missing,
}: {
	firstName: string;
	complete: boolean;
	total: number;
	missing: { id: string; label: string }[];
}) {
	const done = total - missing.length;
	const percent = Math.round((done / total) * 100);

	return (
		<aside
			aria-labelledby="readiness-heading"
			className="rounded-lg border border-slate-200 bg-white p-6 shadow-lg shadow-violet-100/60 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none lg:grid lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10"
		>
			<div>
				<div className="flex items-start justify-between gap-4">
					<div>
						<p className="text-xs font-semibold uppercase tracking-[0.14em] text-violet-700 dark:text-violet-300">
							Seu cadastro
						</p>
						<h2
							id="readiness-heading"
							className="mt-1 font-heading text-xl font-semibold text-slate-950 dark:text-white"
						>
							{complete ? `Cadastro completo, ${firstName}.` : `Olá, ${firstName}. Quase lá.`}
						</h2>
					</div>
					<span
						className={cn(
							'shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums',
							complete
								? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
								: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
						)}
					>
						{percent}%
					</span>
				</div>

				<div
					className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
					role="progressbar"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={percent}
					aria-label="Cadastro completo"
				>
					<div
						className="h-full rounded-full bg-violet-600 transition-[width] duration-500"
						style={{ width: `${percent}%` }}
					/>
				</div>

				{complete ? (
					<p className="mt-4 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
						<CalendarCheck2 className="size-4 text-emerald-600" aria-hidden="true" />
						Você está pronto para criar sua conta de organizador.
					</p>
				) : (
					<>
						<p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
							Faltam {missing.length} {missing.length === 1 ? 'item' : 'itens'} para criar sua conta:
						</p>
						<ul aria-label="O que falta no seu cadastro" className="mt-3 space-y-2">
							{missing.map((item) => (
								<li key={item.id} className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
									<CircleDashed className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
									{item.label}
								</li>
							))}
						</ul>
					</>
				)}
			</div>
			<div className="mt-6 lg:mt-0">
				<PrimaryCta complete={complete} />
			</div>
		</aside>
	);
}

function Step({
	number,
	title,
	text,
	state,
	action,
}: {
	number: number;
	title: string;
	text: string;
	state: 'done' | 'current' | 'upcoming';
	action?: ReactNode;
}) {
	return (
		<li
			aria-current={state === 'current' ? 'step' : undefined}
			className={cn(
				'relative rounded-lg border bg-white p-5 shadow-sm dark:bg-slate-900',
				state === 'current'
					? 'border-violet-400 ring-2 ring-violet-100 dark:border-violet-600 dark:ring-violet-950'
					: 'border-slate-200 dark:border-slate-800',
			)}
		>
			<div className="flex items-center justify-between gap-3">
				<span
					className={cn(
						'flex size-9 items-center justify-center rounded-full text-sm font-bold',
						state === 'done' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
						state === 'current' && 'bg-violet-600 text-white',
						state === 'upcoming' && 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400',
					)}
				>
					{state === 'done' ? <Check className="size-4" aria-hidden="true" /> : number}
				</span>
				{state === 'done' ? (
					<span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
						Concluído
					</span>
				) : state === 'current' ? (
					<span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700 dark:bg-violet-950 dark:text-violet-300">
						Você está aqui
					</span>
				) : null}
			</div>
			<p className="mt-4 font-semibold text-slate-950 dark:text-white">{title}</p>
			<p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">{text}</p>
			{action ? <div className="mt-3">{action}</div> : null}
		</li>
	);
}

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
	return (
		<div className="max-w-2xl">
			<p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700 dark:text-violet-300">
				{eyebrow}
			</p>
			<h2 className="mt-2 font-heading text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
				{title}
			</h2>
			<p className="mt-3 text-slate-600 dark:text-slate-300">{text}</p>
		</div>
	);
}
