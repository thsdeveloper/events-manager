'use client';

import Link from 'next/link';
import { Compass } from '@/components/animate-ui/icons/compass';
// `credit-card` and `ticket` are not in the animate-ui registry — they are
// local components built on the same contract, keeping the lucide geometry.
import { CreditCard } from '@/components/animate-ui/icons/credit-card';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { Key } from '@/components/animate-ui/icons/key';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { LogOut } from '@/components/animate-ui/icons/log-out';
import { SlidersHorizontal } from '@/components/animate-ui/icons/sliders-horizontal';
import { Ticket } from '@/components/animate-ui/icons/ticket';
import { UserRound } from '@/components/animate-ui/icons/user-round';
import { cn } from '@/lib/utils';
import { ProfileAvatarUpload } from './ProfileAvatarUpload';
import { getDisplayName, type ProfileSection, type ProfileUser } from './types';

interface ProfileNavigationProps {
	user: ProfileUser;
	avatarUrl: string;
	completion: number;
	activeSection: ProfileSection;
	onSectionChange: (section: ProfileSection) => void;
	onLogout: () => Promise<void>;
	/** Called after the avatar upload saves, so the page picks up the new photo. */
	onProfileUpdated: (user: ProfileUser) => void;
}

interface NavigationItem {
	id: ProfileSection;
	label: string;
	/** Accepts both lucide and animate-ui icons — they share the `className` prop. */
	icon: React.ComponentType<{ className?: string }>;
}

// `layout-dashboard` and `key` replace the previous eye and shield glyphs: those
// two have no animated counterpart, and these read the same intent.
const accountItems: NavigationItem[] = [
	{ id: 'overview', label: 'Visão geral', icon: LayoutDashboard },
	{ id: 'personal', label: 'Dados pessoais', icon: UserRound },
	{ id: 'security', label: 'Segurança', icon: Key },
	{ id: 'preferences', label: 'Preferências', icon: SlidersHorizontal },
];

const activityItems: NavigationItem[] = [
	{ id: 'ingressos', label: 'Meus ingressos', icon: Ticket },
	{ id: 'payments', label: 'Pagamentos', icon: CreditCard },
];

function roleLabel(role: ProfileUser['role']) {
	if (role === 'admin' || role === 'super_admin') return 'Administrador';
	if (role === 'organizer') return 'Organizador';

	return 'Participante';
}

export function ProfileNavigation({
	user,
	avatarUrl,
	completion,
	activeSection,
	onSectionChange,
	onLogout,
	onProfileUpdated,
}: ProfileNavigationProps) {
	return (
		<aside className="min-w-0 max-w-full lg:sticky lg:top-24 lg:self-start" aria-label="Navegação da conta">
			<div className="w-full min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
				<div className="border-b border-slate-100 p-5 dark:border-slate-800">
					<div className="flex items-center gap-3">
						<ProfileAvatarUpload user={user} avatarUrl={avatarUrl} onUpdated={onProfileUpdated} />
						<div className="min-w-0">
							<p className="truncate text-sm font-semibold text-slate-950 dark:text-white">{getDisplayName(user)}</p>
							<p className="truncate text-xs text-slate-500 dark:text-slate-400">{roleLabel(user.role)}</p>
						</div>
					</div>

					<div className="mt-5">
						<div className="mb-2 flex items-center justify-between text-xs">
							<span className="font-medium text-slate-600 dark:text-slate-300">Perfil completo</span>
							<span className="font-semibold text-slate-900 dark:text-white">{completion}%</span>
						</div>
						<div
							className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
							role="progressbar"
							aria-valuemin={0}
							aria-valuemax={100}
							aria-valuenow={completion}
							aria-label="Perfil completo"
						>
							<div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${completion}%` }} />
						</div>
					</div>
				</div>

				<div className="max-w-full min-w-0 overflow-x-auto p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:overflow-visible">
					<div className="flex min-w-max gap-1 lg:block lg:min-w-0 lg:space-y-1">
						{accountItems.map((item) => (
							<NavigationButton
								key={item.id}
								item={item}
								active={activeSection === item.id}
								onClick={() => onSectionChange(item.id)}
							/>
						))}
					</div>
				</div>

				<div className="hidden border-t border-slate-100 p-2 dark:border-slate-800 lg:block">
					<p className="px-3 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
						Sua atividade
					</p>
					{activityItems.map((item) => (
						<NavigationButton
							key={item.id}
							item={item}
							active={activeSection === item.id}
							onClick={() => onSectionChange(item.id)}
						/>
					))}
					<AnimateIcon animateOnHover>
						<Link
							href="/eventos"
							className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
						>
							<Compass className="size-4" />
							Explorar eventos
						</Link>
					</AnimateIcon>
				</div>

				<div className="hidden border-t border-slate-100 p-2 dark:border-slate-800 lg:block">
					<AnimateIcon animateOnHover>
						<button
							type="button"
							onClick={() => void onLogout()}
							className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-700 dark:text-slate-400 dark:hover:bg-red-950/30 dark:hover:text-red-300"
						>
							<LogOut className="size-4" />
							Sair da conta
						</button>
					</AnimateIcon>
				</div>
			</div>
		</aside>
	);
}

function NavigationButton({ item, active, onClick }: { item: NavigationItem; active: boolean; onClick: () => void }) {
	const Icon = item.icon;

	// The wrapper drives the animation through context, so animate-ui icons react
	// to hover while the plain lucide ones render untouched.
	return (
		<AnimateIcon animateOnHover>
			<button
				type="button"
				onClick={onClick}
				aria-current={active ? 'page' : undefined}
				className={cn(
					'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition lg:w-full',
					active
						? 'bg-violet-50 text-violet-700 dark:bg-violet-950/50 dark:text-violet-200'
						: 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
				)}
			>
				<Icon className="size-4" />
				{item.label}
			</button>
		</AnimateIcon>
	);
}
