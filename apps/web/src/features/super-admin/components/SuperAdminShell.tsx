'use client';

import {
	BarChart3,
	Building2,
	CalendarDays,
	ChevronRight,
	Gauge,
	LogOut,
	ReceiptText,
	Settings2,
	ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

const navigation = [
	{ label: 'Visão geral', href: '/super-admin', icon: Gauge },
	{ label: 'Organizadores', href: '/super-admin/organizadores', icon: Building2 },
	{ label: 'Financeiro', href: '/super-admin/financeiro', icon: BarChart3 },
	{ label: 'Taxas e gateway', href: '/super-admin/taxas', icon: Settings2 },
];

export function SuperAdminShell({
	children,
	userName,
	canOpenOrganizer,
}: {
	children: ReactNode;
	userName: string;
	canOpenOrganizer: boolean;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const active = (href: string) => (href === '/super-admin' ? pathname === href : pathname.startsWith(href));
	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		router.push('/login');
		router.refresh();
	}

	return (
		<div className="min-h-screen bg-slate-50 text-slate-950">
			<aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-slate-950 text-white lg:flex">
				<div className="border-b border-white/10 p-6">
					<Link href="/super-admin" className="flex items-center gap-3">
						<div className="flex size-11 items-center justify-center rounded-2xl bg-violet-500">
							<ShieldCheck className="size-6" />
						</div>
						<div>
							<p className="font-bold tracking-tight">Events Manager</p>
							<p className="text-xs text-slate-400">Administração da plataforma</p>
						</div>
					</Link>
				</div>
				<nav aria-label="Navegação do super admin" className="flex-1 space-y-1 p-4">
					{navigation.map((item) => {
						const Icon = item.icon;

						return (
							<Link
								key={item.href}
								href={item.href}
								className={cn(
									'flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition',
									active(item.href)
										? 'bg-white text-slate-950 shadow-sm'
										: 'text-slate-300 hover:bg-white/10 hover:text-white',
								)}
							>
								<Icon className="size-5" />
								{item.label}
								<ChevronRight className="ml-auto size-4 opacity-50" />
							</Link>
						);
					})}
				</nav>
				<div className="space-y-2 border-t border-white/10 p-4">
					{canOpenOrganizer && (
						<Link
							href="/admin"
							className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
						>
							<CalendarDays className="size-5" />
							Painel do organizador
						</Link>
					)}
					<button
						onClick={logout}
						className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-slate-300 hover:bg-red-500/10 hover:text-red-300"
					>
						<LogOut className="size-5" />
						Sair
					</button>
				</div>
			</aside>
			<div className="lg:pl-72">
				<header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
					<div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Super admin</p>
							<p className="text-sm font-medium text-slate-700">{userName}</p>
						</div>
						<div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
							<ShieldCheck className="size-4" />
							Acesso global
						</div>
					</div>
				</header>
				<nav
					aria-label="Navegação móvel"
					className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 lg:hidden"
				>
					{navigation.map((item) => (
						<Link
							key={item.href}
							href={item.href}
							className={cn(
								'whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold',
								active(item.href) ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700',
							)}
						>
							{item.label}
						</Link>
					))}
				</nav>
				<main className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
					{children}
				</main>
			</div>
		</div>
	);
}
