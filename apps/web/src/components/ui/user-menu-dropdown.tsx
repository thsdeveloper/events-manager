'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
	UserRound,
	Ticket,
	Heart,
	LayoutDashboard,
	LifeBuoy,
	LogOut,
	LogIn,
	Moon,
	Sun,
	ChevronRight,
	Sparkles,
	Loader2,
	ShieldCheck,
} from 'lucide-react';
import { useTheme } from 'next-themes';

import { cn } from '@/lib/utils';
import { useServerAuth } from '@/hooks/useServerAuth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetTrigger, SheetContent, SheetTitle, SheetDescription, SheetClose } from '@/components/ui/sheet';

const NAVIGATIONS: Array<{
	key: string;
	label: string;
	description: string;
	href: string;
	icon: typeof UserRound;
	badge?: string;
}> = [
	{
		key: 'account',
		label: 'Minha conta',
		description: 'Atualize dados pessoais e preferências',
		href: '/perfil',
		icon: UserRound,
	},
	{
		key: 'tickets',
		label: 'Meus ingressos',
		description: 'Veja seus próximos eventos e QR Codes',
		href: '/meus-ingressos',
		icon: Ticket,
	},
	{
		key: 'favorites',
		label: 'Favoritos',
		description: 'Eventos que você acompanhou recentemente',
		href: '/favoritos',
		icon: Heart,
	},
];

export function UserMenuDropdown() {
	const [open, setOpen] = useState(false);
	const { user, logout, isLoading, isOrganizer, hasPendingOrganizerRequest } = useServerAuth();
	const { theme, setTheme, resolvedTheme } = useTheme();

	const isDarkMode = theme === 'dark' || resolvedTheme === 'dark';

	const avatarUrl = useMemo(() => {
		if (!user) {
			return '';
		}

		const raw = (user as any)?.avatar_url ?? (user as any)?.avatar ?? '';

		return typeof raw === 'string' ? raw : '';
	}, [user]);

	const initials = useMemo(() => {
		if (!user) {
			return 'EF';
		}

		const firstInitial = user.first_name?.[0] ?? '';
		const lastInitial = user.last_name?.[0] ?? '';
		const fallback = user.email?.[0] ?? 'E';

		return `${firstInitial}${lastInitial}`.toUpperCase() || fallback.toUpperCase();
	}, [user]);

	const displayName = useMemo(() => {
		if (!user) {
			return 'Visitante';
		}

		const first = user.first_name ?? '';
		const last = user.last_name ?? '';
		const full = `${first} ${last}`.trim();

		return full || user.email?.split('@')[0] || 'Usuário';
	}, [user]);

	const profileCompletion = useMemo(() => {
		const first = Boolean(user?.first_name);
		const last = Boolean(user?.last_name);
		const email = Boolean(user?.email);
		const checks = [first, last, email];
		const completed = checks.filter(Boolean).length;

		return Math.min(100, Math.round((completed / checks.length || 1) * 100));
	}, [user]);

	const profileHighlights = useMemo(
		() => [
			{
				label: 'Foto do perfil',
				done: Boolean(avatarUrl),
			},
			{
				label: 'Nome completo',
				done: Boolean(user?.first_name && user?.last_name),
			},
			{
				label: 'Contato confirmado',
				done: Boolean(user?.email),
			},
		],
		[avatarUrl, user],
	);

	const organizerBadge = useMemo(() => {
		if (!isOrganizer) {
			return hasPendingOrganizerRequest
				? {
						variant: 'warning' as const,
						label: 'Solicitação em análise',
					}
				: null;
		}

		return {
			variant: 'success' as const,
			label: 'Organizador ativo',
		};
	}, [isOrganizer, hasPendingOrganizerRequest]);

	const navigationItems = useMemo(() => {
		const items = [...NAVIGATIONS];

		if (user?.role === 'super_admin') {
			items.unshift({
				key: 'super-admin',
				label: 'Super admin',
				description: 'Visão global, organizadores, finanças e taxas',
				href: '/super-admin',
				icon: ShieldCheck,
				badge: 'Global',
			});
		}

		if (isOrganizer) {
			items.unshift({
				key: 'organizer',
				label: 'Área do organizador',
				description: 'Dashboards, vendas e finanças em tempo real',
				href: '/admin/dashboard',
				icon: LayoutDashboard,
				badge: 'Pro',
			});
		}

		return items;
	}, [isOrganizer, user?.role]);

	if (isLoading) {
		return (
			<div className="flex size-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
				<Loader2 className="size-4 animate-spin text-slate-500 dark:text-slate-200" />
				<span className="sr-only">Carregando...</span>
			</div>
		);
	}

	if (!user) {
		return (
			<Button
				variant="default"
				size="sm"
				asChild
				className="gap-2 rounded-full bg-gradient-to-r from-purple-600 to-indigo-600 font-semibold shadow-md transition-transform duration-200 hover:scale-105 hover:from-purple-700 hover:to-indigo-700"
			>
				<Link href="/login">
					<LogIn className="size-4" />
					Entrar
				</Link>
			</Button>
		);
	}

	return (
		<Sheet open={open} onOpenChange={setOpen}>
			<SheetTrigger asChild>
				<button
					type="button"
					className="group relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-300 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900"
					aria-label="Abrir menu do usuário"
				>
					<Avatar className="size-10">
						<AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
						<AvatarFallback className="bg-transparent text-sm font-semibold uppercase text-white">
							{initials}
						</AvatarFallback>
					</Avatar>
					<span
						aria-hidden="true"
						className="absolute inset-0 rounded-full border border-white/20 transition duration-200 group-hover:border-white/40"
					/>
					{organizerBadge?.variant === 'success' && (
						<span className="absolute -right-1 -top-1 flex size-3 rounded-full border border-slate-900 bg-emerald-400 shadow-md" />
					)}
				</button>
			</SheetTrigger>

			<SheetContent
				side="right"
				hideCloseButton
				overlayClassName="bg-slate-950/60 backdrop-blur-md transition duration-300 data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:animate-in data-[state=open]:fade-in"
				className="z-[70] flex size-full max-w-md flex-col overflow-hidden border-l border-white/10 bg-slate-900 text-white shadow-2xl transition-transform duration-300 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 data-[state=closed]:translate-x-full data-[state=open]:translate-x-0"
			>
				<SheetTitle className="sr-only">Menu da conta do usuário EventsFlow</SheetTitle>
				<SheetDescription className="sr-only">Acesse atalhos, preferências e suporte da sua conta.</SheetDescription>

				<motion.div
					initial={{ x: 48, opacity: 0 }}
					animate={{ x: 0, opacity: 1 }}
					exit={{ x: 48, opacity: 0 }}
					transition={{ type: 'spring', stiffness: 240, damping: 32 }}
					className="flex h-full flex-col"
				>
					<header className="relative overflow-hidden p-6">
						<div className="absolute inset-0">
							<div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600" />
							<div className="absolute inset-0 opacity-40 mix-blend-screen">
								<div className="absolute -left-10 top-[-40%] size-56 rounded-full bg-purple-400 blur-3xl" />
								<div className="absolute right-0 top-0 size-48 rounded-full bg-indigo-400 blur-3xl" />
							</div>
						</div>

						<div className="relative flex items-start justify-between">
							<div className="flex items-start gap-4">
								<div className="relative">
									<Avatar className="size-16 border-4 border-white/30 shadow-xl">
										<AvatarImage src={avatarUrl || undefined} alt={displayName} className="object-cover" />
										<AvatarFallback className="bg-white/20 text-lg font-semibold uppercase text-white">
											{initials}
										</AvatarFallback>
									</Avatar>
									<span className="absolute -bottom-1 right-1 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-white shadow-lg">
										<span className="relative flex size-1.5">
											<span className="absolute inset-0 rounded-full bg-white/80 animate-ping" />
											<span className="relative inline-flex size-1.5 rounded-full bg-white" />
										</span>
										Online
									</span>
								</div>

								<div className="space-y-1">
									<p className="text-sm font-medium uppercase tracking-[0.3em] text-white/70">Bem-vindo(a)</p>
									<h2 className="text-2xl font-semibold tracking-tight text-white">{displayName}</h2>
									<p className="text-sm text-white/80">{user.email}</p>
									<div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
										<Badge className="bg-white/15 text-white backdrop-blur">
											<Sparkles className="mr-1 size-3.5" />
											Conta EventsFlow
										</Badge>
										{organizerBadge && (
											<Badge
												className={cn(
													'border-none px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide',
													organizerBadge.variant === 'success'
														? 'bg-emerald-500 text-white'
														: 'bg-amber-400 text-slate-900',
												)}
											>
												{organizerBadge.variant === 'success' ? <ShieldCheck className="mr-1 size-3.5" /> : null}
												{organizerBadge.label}
											</Badge>
										)}
										{hasPendingOrganizerRequest && !isOrganizer && (
											<Badge className="bg-white/15 text-white">
												<span className="size-2 rounded-full bg-amber-400" />
												<span className="ml-1">Onboarding AbacatePay</span>
											</Badge>
										)}
									</div>
								</div>
							</div>

							<SheetClose asChild>
								<button
									type="button"
									className="rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
									aria-label="Fechar menu"
								>
									<span className="sr-only">Fechar</span>
									<ChevronRight className="size-5 rotate-180" />
								</button>
							</SheetClose>
						</div>

						<div className="relative mt-6">
							<div className="flex items-center justify-between text-xs font-medium text-white/80">
								<span>Saúde do perfil</span>
								<span>{profileCompletion}% completo</span>
							</div>
							<div className="mt-2 h-2 rounded-full bg-white/20">
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: `${profileCompletion}%` }}
									className="h-full rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.55)]"
								/>
							</div>
							<div className="mt-2 flex flex-wrap gap-2 text-[11px] text-white/85">
								{profileHighlights.map((item) => (
									<span
										key={item.label}
										className={cn(
											'inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-medium',
											item.done ? 'bg-emerald-400/20 text-white' : 'bg-white/10 text-white/70',
										)}
									>
										<span className={cn('size-1.5 rounded-full', item.done ? 'bg-emerald-300' : 'bg-white/40')} />
										{item.label}
									</span>
								))}
							</div>
						</div>
					</header>

					<div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
						<nav className="space-y-6">
							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">
										Navegação principal
									</p>
									<Badge className="bg-purple-500/20 text-xs text-purple-200">Atualizado</Badge>
								</div>
								<ul className="space-y-2">
									{navigationItems.map((item) => {
										const Icon = item.icon;
										const isFeaturedEntry = item.key === 'organizer' || item.key === 'super-admin';

										return (
											<li key={item.key}>
												<SheetClose asChild>
													<Link
														href={item.href}
														className={cn(
															'group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 hover:border-white/10 hover:bg-white/10',
															isFeaturedEntry && 'border-purple-400/60 bg-purple-500/10',
														)}
													>
														<div className="flex items-center gap-3">
															<span
																className={cn(
																	'flex size-12 items-center justify-center rounded-xl bg-white/10 text-white transition group-hover:bg-white/20',
																	isFeaturedEntry && 'bg-purple-500/20 text-purple-50 group-hover:bg-purple-500/30',
																)}
															>
																<Icon className="size-5" strokeWidth={1.8} />
															</span>
															<div>
																<p className="text-sm font-semibold text-white">{item.label}</p>
																<p className="text-xs text-slate-300">{item.description}</p>
															</div>
														</div>
														<div className="flex items-center gap-2">
															{item.badge && (
																<span className="rounded-full bg-purple-500/20 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-purple-100">
																	{item.badge}
																</span>
															)}
															<ChevronRight className="size-4 text-white/60 transition group-hover:translate-x-1 group-hover:text-white" />
														</div>
													</Link>
												</SheetClose>
											</li>
										);
									})}
								</ul>
							</div>

							<div className="space-y-3">
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Preferências</p>
								<div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 focus-within:ring-2 focus-within:ring-purple-400/70 focus-within:ring-offset-2 focus-within:ring-offset-slate-900 hover:border-white/10 hover:bg-white/10">
									<div>
										<p className="text-sm font-semibold text-white flex items-center gap-2">
											{isDarkMode ? <Moon className="size-4" /> : <Sun className="size-4" />}
											Modo escuro
										</p>
										<p className="text-xs text-slate-300">
											{isDarkMode
												? 'Experiência otimizada para ambientes com pouca luz'
												: 'Prefira cores claras e alto contraste'}
										</p>
									</div>
									<Switch
										checked={isDarkMode}
										onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
										aria-label="Alternar modo escuro"
										className="scale-110"
									/>
								</div>
							</div>

							<div className="space-y-3">
								<p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-400">Conta</p>
								<SheetClose asChild>
									<Link
										href="/perfil"
										className="group flex items-center justify-between rounded-2xl border border-white/5 bg-white/5 px-4 py-3 transition hover:border-white/10 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
									>
										<div className="flex items-center gap-3">
											<span className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-white transition group-hover:bg-white/20">
												<LifeBuoy className="size-5" strokeWidth={1.8} />
											</span>
											<div>
												<p className="text-sm font-semibold text-white">Perfil e segurança</p>
												<p className="text-xs text-slate-300">Dados pessoais, senha e preferências da conta</p>
											</div>
										</div>
										<ChevronRight className="size-4 text-white/60 transition group-hover:translate-x-1 group-hover:text-white" />
									</Link>
								</SheetClose>
							</div>
						</nav>
					</div>

					<footer className="border-t border-white/10 bg-slate-950/50 px-6 py-5">
						<SheetClose asChild>
							<Button
								type="button"
								onClick={logout}
								variant="ghost"
								className="group w-full justify-between gap-3 rounded-2xl border border-transparent bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition hover:border-red-400/40 hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
							>
								<span className="flex items-center gap-3">
									<span className="flex size-11 items-center justify-center rounded-xl bg-red-500/10 text-red-200 transition group-hover:bg-red-500/20 group-hover:text-red-100">
										<LogOut className="size-5" strokeWidth={1.8} />
									</span>
									<span>Sair da conta</span>
								</span>
								<ChevronRight className="size-4 text-red-200/70 transition group-hover:translate-x-1 group-hover:text-red-100" />
							</Button>
						</SheetClose>
					</footer>
				</motion.div>
			</SheetContent>
		</Sheet>
	);
}
