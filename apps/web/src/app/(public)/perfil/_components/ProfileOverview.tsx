'use client';

import { ArrowRight, Check, Circle, MapPin, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { getDisplayName, type ProfileSection, type ProfileUser } from './types';

interface ProfileOverviewProps {
	user: ProfileUser;
	completion: number;
	onNavigate: (section: ProfileSection) => void;
}

export function ProfileOverview({ user, completion, onNavigate }: ProfileOverviewProps) {
	const firstName = user.first_name?.trim() || getDisplayName(user).split(' ')[0];
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
			<section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-8">
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
					<p className="shrink-0 text-xs text-slate-400">ID da conta · {user.id.slice(0, 8)}</p>
				</div>

				<div className="mt-8 grid gap-3 border-t border-slate-100 pt-6 dark:border-slate-800 sm:grid-cols-3">
					<AccountFact label="E-mail da conta" value={user.email} icon={ShieldCheck} />
					<AccountFact label="Localização" value={user.location || 'Não informada'} icon={MapPin} />
					<AccountFact label="Status da conta" value="Ativa" icon={ShieldCheck} />
				</div>
			</section>

			{/* Full width rather than a column of the old two-up grid: the "Seu próximo
			    evento" card that used to sit beside it is gone, and a narrow card alone
			    on one side would read as a layout bug. */}
			<section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
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
	);
}

function AccountFact({ label, value, icon: Icon }: { label: string; value: string; icon: typeof ShieldCheck }) {
	return (
		<div className="flex min-w-0 items-start gap-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
			<Icon className="mt-0.5 size-4 shrink-0 text-slate-400" />
			<div className="min-w-0">
				<p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
				<p className="mt-1 truncate text-sm font-medium text-slate-700 dark:text-slate-200">{value}</p>
			</div>
		</div>
	);
}
