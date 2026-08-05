'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, Calendar, Settings, LogOut } from 'lucide-react';
import type { AuthUser, OrganizerProfile } from '@/lib/auth/server-auth';

type OrganizerNavigationProps = {
	user: AuthUser;
	organizer: OrganizerProfile;
};

export default function OrganizerNavigation({ user, organizer }: OrganizerNavigationProps) {
	const pathname = usePathname();

	const handleLogout = async () => {
		try {
			await fetch('/api/auth/logout', {
				method: 'POST',
			credentials: 'include',
			});

			window.location.href = '/login';
		} catch (error) {
			console.error('Logout failed:', error);
		}
	};

	const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

	return (
		<header className="bg-white border-b border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex justify-between items-center h-16">
					<div className="flex items-center gap-8">
						<div className="flex items-center gap-3">
							<Building2 className="size-6 text-purple-600" />
							<div>
								<Link href="/admin/dashboard" className="text-xl font-bold text-gray-900">
									{organizer.name}
								</Link>
								<p className="text-xs text-gray-500">Painel do Organizador</p>
							</div>
						</div>
						<nav className="hidden md:flex gap-6">
							<Link
								href="/admin/dashboard"
								className={`text-sm font-medium flex items-center gap-2 ${
									isActive('/admin/dashboard')
										? 'text-purple-600'
										: 'text-gray-700 hover:text-gray-900'
								}`}
							>
								<Calendar className="size-4" />
								Dashboard
							</Link>
							<Link
								href="/admin/eventos"
								className={`text-sm font-medium flex items-center gap-2 ${
									isActive('/admin/eventos')
										? 'text-purple-600'
										: 'text-gray-700 hover:text-gray-900'
								}`}
							>
								<Calendar className="size-4" />
								Eventos
							</Link>
							<Link
								href="/admin/configuracoes"
								className={`text-sm font-medium flex items-center gap-2 ${
									isActive('/admin/configuracoes')
										? 'text-purple-600'
										: 'text-gray-700 hover:text-gray-900'
								}`}
							>
								<Settings className="size-4" />
								Configurações
							</Link>
						</nav>
					</div>
					<div className="flex items-center gap-4">
						<div className="hidden md:block text-right">
							<p className="text-sm font-medium text-gray-900">
								{user.first_name || user.email}
							</p>
							{organizer.payout_status === 'enabled' ? (
								<p className="text-xs text-green-600">✓ Repasses ativos</p>
							) : (
								<p className="text-xs text-amber-600">⚠ Repasses pendentes</p>
							)}
						</div>
						<button
							onClick={handleLogout}
							className="text-sm font-medium text-gray-700 hover:text-gray-900 flex items-center gap-2"
						>
							<LogOut className="size-4" />
							Sair
						</button>
					</div>
				</div>
			</div>
		</header>
	);
}
