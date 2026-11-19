'use client';

import {
	BarChart3,
	Calendar,
	LayoutDashboard,
	Settings,
	Users,
	Wallet,
	Globe,
	Plus,
	Building2,
	CreditCard,
	Landmark,
} from 'lucide-react';
import Link from 'next/link';
import { SidebarSubmenu } from './SidebarSubmenu';
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
	SidebarGroupLabel,
	SidebarGroupAction,
	SidebarGroupContent,
	SidebarMenuAction,
	SidebarMenuBadge,
	useSidebar,
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
	eventCount,
}: {
	organizer: OrganizerProfile;
	organizations: OrganizationOption[];
	eventCount?: number;
}) {
	const pathname = usePathname();
	const { access } = usePermissions();
	const { setOpenMobile } = useSidebar();
	const closeMobile = () => setOpenMobile(false);
	const canCreate = canVisitAdminPath(access, '/admin/eventos/novo');
	const operation = organizerNavigation.slice(0, 5).filter((item) => canVisitAdminPath(access, item.href));
	const settings = [
		{ label: 'Perfil da organização', href: '/admin/configuracoes', icon: Building2, exact: true },
		{ label: 'Formas de pagamento', href: '/admin/configuracoes#pagamentos', icon: CreditCard },
		{ label: 'Dados de recebimento', href: '/admin/financeiro/recebimento', icon: Landmark },
	].filter((item) => canVisitAdminPath(access, item.href.split('#')[0]));

	return (
		<Sidebar collapsible="icon" variant="inset">
			<SidebarHeader>
				<SidebarTrigger className="self-end md:hidden" aria-label="Fechar navegação" />
				<SidebarMenu>
					<SidebarMenuItem>
						<OrganizationSwitcher
							organizations={organizations}
							activeId={organizer.id}
							sidebar
							onNavigate={closeMobile}
						/>
					</SidebarMenuItem>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<nav aria-label="Navegação do organizador">
					{operation.length > 0 && (
						<SidebarGroup>
							<SidebarGroupLabel>Operação</SidebarGroupLabel>
							<SidebarGroupContent>
								<SidebarMenu>
									{operation.map(({ name, href, icon }) => {
										const events = href === '/admin/eventos';
										const active =
											pathname === href || (href !== '/admin/financeiro' && pathname.startsWith(`${href}/`));

										return (
											<SidebarMenuItem key={href}>
												<SidebarNavLink
													href={href}
													label={name}
													icon={icon}
													active={active}
													className={events ? (canCreate ? 'pr-16' : 'pr-8') : undefined}
												/>
												{events && eventCount !== undefined && (
													<SidebarMenuBadge
														className={canCreate ? 'right-7 top-2.5' : 'top-2.5'}
														aria-label={`${eventCount} eventos disponíveis`}
													>
														{eventCount}
													</SidebarMenuBadge>
												)}
												{events && canCreate && (
													<SidebarMenuAction
														render={<Link href="/admin/eventos/novo" onClick={closeMobile} />}
														aria-label="Criar evento"
														title="Criar evento"
														className="top-2.5"
													>
														<Plus aria-hidden="true" />
													</SidebarMenuAction>
												)}
											</SidebarMenuItem>
										);
									})}
								</SidebarMenu>
							</SidebarGroupContent>
						</SidebarGroup>
					)}
					<SidebarGroup>
						<SidebarGroupLabel>Organização</SidebarGroupLabel>
						<SidebarGroupAction
							render={<Link href="/perfil/organizador/novo" onClick={closeMobile} />}
							aria-label="Cadastrar nova conta"
							title="Cadastrar nova conta"
						>
							<Plus aria-hidden="true" />
						</SidebarGroupAction>
						<SidebarGroupContent>
							<SidebarMenu>
								{canVisitAdminPath(access, '/admin/equipe') && (
									<SidebarMenuItem>
										<SidebarNavLink
											href="/admin/equipe"
											label="Equipe"
											icon={Users}
											active={pathname === '/admin/equipe'}
										/>
									</SidebarMenuItem>
								)}
								<SidebarSubmenu label="Configurações" icon={Settings} items={settings} pathname={pathname} />
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</nav>
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
