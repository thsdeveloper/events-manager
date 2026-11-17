'use client';

import { Button } from '@/components/ui/button';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from '@/components/ui/sidebar';
import {
	OrganizationSwitcher,
	type OrganizationOption,
} from '@/features/organizer-settings/components/OrganizationSwitcher';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { BarChart3, Calendar, LayoutDashboard, Settings, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export const organizerNavigation = [
	{ name: 'Visão geral', href: '/admin/dashboard', icon: LayoutDashboard },
	{ name: 'Eventos', href: '/admin/eventos', icon: Calendar },
	{ name: 'Participantes', href: '/admin/participantes', icon: Users },
	{ name: 'Análises', href: '/admin/analises', icon: BarChart3 },
	{ name: 'Financeiro', href: '/admin/financeiro', icon: Wallet },
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
	const { setOpenMobile } = useSidebar();
	const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

	return (
		<Sidebar>
			<SidebarHeader className="border-b p-4">
				<OrganizationSwitcher organizations={organizations} activeId={organizer.id} />
			</SidebarHeader>
			<SidebarContent>
				<SidebarGroup>
					<nav aria-label="Navegação do organizador">
						<SidebarMenu>
							{organizerNavigation.map((item) => (
								<SidebarMenuItem key={item.href}>
									<SidebarMenuButton asChild isActive={isActive(item.href)} size="lg">
										<Link
											href={item.href}
											aria-current={isActive(item.href) ? 'page' : undefined}
											onClick={() => setOpenMobile(false)}
										>
											<item.icon aria-hidden="true" />
											<span>{item.name}</span>
										</Link>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</nav>
				</SidebarGroup>
			</SidebarContent>
			<SidebarFooter className="border-t p-4">
				<Button asChild variant="outline">
					<Link href="/">Ver site público</Link>
				</Button>
			</SidebarFooter>
		</Sidebar>
	);
}
