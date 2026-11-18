'use client';

import { BarChart3, Calendar, LayoutDashboard, Settings, Users, Wallet, Globe } from 'lucide-react';
import { SidebarNavLink } from './SidebarNavLink';
import { usePermissions } from '@/components/auth/PermissionsProvider';
import { canVisitAdminPath } from '@/lib/auth/permission-policy';
import { usePathname } from 'next/navigation';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import {
	OrganizationSwitcher,
	type OrganizationOption,
} from '@/features/organizer-settings/components/OrganizationSwitcher';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuItem,
	SidebarTrigger,
	SidebarRail,
} from '@/components/ui/sidebar';

export const organizerNavigation = [
	{ name: 'Visão geral', href: '/admin/dashboard', icon: LayoutDashboard },
	{ name: 'Eventos', href: '/admin/eventos', icon: Calendar },
	{ name: 'Participantes', href: '/admin/participantes', icon: Users },
	{ name: 'Análises', href: '/admin/analises', icon: BarChart3 },
	{ name: 'Financeiro', href: '/admin/financeiro', icon: Wallet },
	{ name: 'Equipe', href: '/admin/equipe', icon: Users },
	{ name: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export default function AdminSidebar({
	organizer,
	organizations,
}: {
	organizer: OrganizerProfile;
	organizations: OrganizationOption[];
}) {
	const pathname = usePathname();
	const { access } = usePermissions();

	return (
		<Sidebar collapsible="icon">
			<SidebarHeader>
				<SidebarTrigger className="self-end md:hidden" aria-label="Fechar navegação" />
				<OrganizationSwitcher organizations={organizations} activeId={organizer.id} />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<nav aria-label="Navegação do organizador">
						<SidebarMenu>
							{organizerNavigation
								.filter((item) => canVisitAdminPath(access, item.href))
								.map(({ name, href, icon: Icon }) => {
									const active = pathname === href || pathname.startsWith(`${href}/`);

									return (
										<SidebarMenuItem key={href}>
											<SidebarNavLink href={href} label={name} icon={Icon} active={active} />
										</SidebarMenuItem>
									);
								})}
						</SidebarMenu>
					</nav>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter>
				<SidebarMenu>
					<SidebarMenuItem>
						<SidebarNavLink href="/" label="Ver site público" icon={Globe} />
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
