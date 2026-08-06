'use client';

import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
	ArrowRight,
	CalendarDays,
	Check,
	ChevronRight,
	Circle,
	Compass,
	MapPin,
	ShieldCheck,
	Ticket,
	UserRound,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getDisplayName, type ProfileSection, type ProfileUser, type TicketSummary } from './types';

interface ProfileOverviewProps {
	user: ProfileUser;
	completion: number;
	tickets: TicketSummary;
	onNavigate: (section: ProfileSection) => void;
}

export function ProfileOverview({ user, completion, tickets, onNavigate }: ProfileOverviewProps) {
	const firstName = user.first_name?.trim() || getDisplayName(user).split(' ')[0];
	const nextRegistration = getNextRegistration(tickets.registrations);
	const nextEvent =
		nextRegistration && typeof nextRegistration.event_id === 'object' ? nextRegistration.event_id : null;
	const checklist = [
		{
			label: 'Nome e contato',
			complete: Boolean(user.first_name && user.last_name && user.email),
		},
		{ label: 'Foto de perfil', complete: Boolean(user.avatar) },
		{ label: 'Sobre você', complete: Boolean(user.title && user.location && user.description) },
	];

	return (
		<div className="space-y-6">
			<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
				<div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
					<div className="max-w-xl">
						<p className="text-sm font-medium text-violet-700 dark:text-violet-300">Sua conta</p>
						<h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
							Olá, {firstName}.
						</h1>
						<p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
							Aqui você mantém seus dados atualizados e controla como sua conta funciona.
						</p>
					</div>
					<Button
						type="button"
						variant="outline"
						className="self-start rounded-xl"
						onClick={() => onNavigate('personal')}
					>
						<UserRound />
						Editar perfil
					</Button>
				</div>

				<div className="mt-8 grid gap-3 border-t border-slate-100 pt-6 dark:border-slate-800 sm:grid-cols-3">
					<AccountFact label="E-mail da conta" value={user.email} icon={ShieldCheck} />
					<AccountFact label="Localização" value={user.location || 'Não informada'} icon={MapPin} />
					<AccountFact label="Status da conta" value="Ativa" icon={ShieldCheck} />
				</div>
			</section>

			<div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
				<section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
					<div className="flex items-center justify-between border-b border-slate-100 px-6 py-5 dark:border-slate-800">
						<div>
							<p className="text-sm font-semibold text-slate-950 dark:text-white">Seu próximo evento</p>
							<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
								Acesso rápido ao ingresso que você vai usar primeiro.
							</p>
						</div>
						<Link
							href="/meus-ingressos"
							className="hidden items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-800 dark:text-violet-300 sm:flex"
						>
							Ver ingressos
							<ChevronRight className="size-4" />
						</Link>
					</div>

					{tickets.isLoading ? (
						<div className="animate-pulse p-6">
							<div className="h-4 w-32 rounded bg-slate-100 dark:bg-slate-800" />
							<div className="mt-4 h-7 w-3/4 rounded bg-slate-100 dark:bg-slate-800" />
							<div className="mt-3 h-4 w-1/2 rounded bg-slate-100 dark:bg-slate-800" />
						</div>
					) : nextEvent ? (
						<div className="p-6">
							<div className="flex items-start gap-4">
								<div className="flex size-14 shrink-0 flex-col items-center justify-center rounded-xl bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200">
									<span className="text-[10px] font-bold uppercase tracking-wide">
										{format(new Date(nextEvent.start_date), 'MMM', { locale: ptBR })}
									</span>
									<span className="text-xl font-bold leading-none">{format(new Date(nextEvent.start_date), 'dd')}</span>
								</div>
								<div className="min-w-0 flex-1">
									<p className="truncate text-lg font-semibold text-slate-950 dark:text-white">{nextEvent.title}</p>
									<p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
										{format(new Date(nextEvent.start_date), "EEEE, d 'de' MMMM 'às' HH:mm", {
											locale: ptBR,
										})}
									</p>
									{nextEvent.location_name && (
										<p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
											<MapPin className="size-3.5" />
											<span className="truncate">{nextEvent.location_name}</span>
										</p>
									)}
								</div>
							</div>
							<Button asChild className="mt-6 w-full rounded-xl sm:w-auto">
								<Link href="/meus-ingressos">
									<Ticket />
									Abrir ingresso
								</Link>
							</Button>
						</div>
					) : (
						<div className="p-6">
							<div className="flex size-11 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
								<CalendarDays className="size-5 text-slate-500" />
							</div>
							<p className="mt-4 font-semibold text-slate-950 dark:text-white">
								{tickets.hasError ? 'Não foi possível consultar seus ingressos' : 'Nenhum evento agendado'}
							</p>
							<p className="mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
								{tickets.hasError
									? 'Tente acessar seus ingressos novamente em alguns instantes.'
									: 'Quando você garantir um ingresso, os detalhes do próximo evento aparecerão aqui.'}
							</p>
							<Button asChild variant="outline" className="mt-5 rounded-xl">
								<Link href="/eventos">
									<Compass />
									Explorar eventos
								</Link>
							</Button>
						</div>
					)}
				</section>

				<section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
					<div className="flex items-start justify-between gap-4">
						<div>
							<p className="text-sm font-semibold text-slate-950 dark:text-white">Complete seu perfil</p>
							<p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
								Deixe sua conta pronta para inscrições mais rápidas.
							</p>
						</div>
						<span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
							{completion}%
						</span>
					</div>

					<div className="my-5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
						<div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${completion}%` }} />
					</div>

					<ul className="space-y-3">
						{checklist.map((item) => (
							<li key={item.label} className="flex items-center gap-3 text-sm">
								<span
									className={cn(
										'flex size-5 items-center justify-center rounded-full',
										item.complete
											? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
											: 'bg-slate-100 text-slate-400 dark:bg-slate-800',
									)}
								>
									{item.complete ? <Check className="size-3" /> : <Circle className="size-2.5" />}
								</span>
								<span
									className={
										item.complete
											? 'text-slate-500 line-through dark:text-slate-400'
											: 'text-slate-700 dark:text-slate-200'
									}
								>
									{item.label}
								</span>
							</li>
						))}
					</ul>

					<button
						type="button"
						onClick={() => onNavigate('personal')}
						className="mt-6 flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-800 dark:text-violet-300"
					>
						Atualizar informações
						<ArrowRight className="size-4" />
					</button>
				</section>
			</div>
		</div>
	);
}

function AccountFact({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) {
	return (
		<div className="flex min-w-0 items-start gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-950/50">
			<Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
			<div className="min-w-0">
				<p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
				<p className="mt-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
			</div>
		</div>
	);
}

function getNextRegistration(registrations: TicketSummary['registrations']) {
	return registrations
		.filter((registration) => {
			if (registration.status === 'cancelled' || typeof registration.event_id !== 'object') return false;

			return new Date(registration.event_id.start_date).getTime() >= Date.now();
		})
		.sort((a, b) => {
			const firstDate = typeof a.event_id === 'object' ? new Date(a.event_id.start_date).getTime() : 0;
			const secondDate = typeof b.event_id === 'object' ? new Date(b.event_id.start_date).getTime() : 0;

			return firstDate - secondDate;
		})[0];
}
