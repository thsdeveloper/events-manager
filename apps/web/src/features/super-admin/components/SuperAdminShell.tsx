'use client';
import { usePlatformPermissions } from '@/features/platform-access/PlatformPermissions';
import { canVisitPlatformPath, preferredPlatformPath } from '@/features/platform-access/policy';

import { WorkspaceSwitcher } from '@/components/admin/WorkspaceSwitcher';
import { SidebarNavLink } from '@/components/admin/SidebarNavLink';
import {
	BarChart3,
	Building2,
	CalendarDays,
	FileText,
	FormInput,
	Gauge,
	Globe,
	Images,
	LayoutTemplate,
	ListTree,
	LogOut,
	Newspaper,
	Palette,
	Route,
	Tags,
	Settings2,
	ShieldCheck,
	Users,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { UserMenu } from '@/components/layout/UserMenu';
import type { AuthUser } from '@/lib/auth/server-auth';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarInset,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
	SidebarTrigger,
	SidebarRail,
	useSidebar,
} from '@/components/ui/sidebar';

interface NavigationItem {
	label: string;
	href: string;
	icon: typeof Gauge;
	/** Só marca ativo quando o caminho é exatamente este (raiz de uma seção). */
	exact?: boolean;
}

interface NavigationGroup {
	label: string;
	items: NavigationItem[];
}

const navigationGroups: NavigationGroup[] = [
	{
		label: 'Plataforma',
		items: [
			{ label: 'Visão geral', href: '/super-admin', icon: Gauge, exact: true },
			{ label: 'Organizadores', href: '/super-admin/organizadores', icon: Building2 },
			{ label: 'Financeiro', href: '/super-admin/financeiro', icon: BarChart3 },
			{ label: 'Taxas e gateway', href: '/super-admin/taxas', icon: Settings2 },
			{ label: 'Identidade visual', href: '/super-admin/identidade-visual', icon: Palette },
			{ label: 'Categorias', href: '/super-admin/categorias', icon: Tags },
			{ label: 'Equipe', href: '/super-admin/equipe', icon: Users },
		],
	},
	{
		label: 'Conteúdo',
		items: [
			{ label: 'Visão do conteúdo', href: '/super-admin/conteudo', icon: LayoutTemplate, exact: true },
			{ label: 'Páginas', href: '/super-admin/conteudo/paginas', icon: FileText },
			{ label: 'Blog', href: '/super-admin/conteudo/blog', icon: Newspaper },
			{ label: 'Menus', href: '/super-admin/conteudo/menus', icon: ListTree },
			{ label: 'Formulários', href: '/super-admin/conteudo/formularios', icon: FormInput },
			{ label: 'Redirecionamentos', href: '/super-admin/conteudo/redirecionamentos', icon: Route },
			{ label: 'Mídia', href: '/super-admin/conteudo/midia', icon: Images },
			{ label: 'Site e SEO', href: '/super-admin/conteudo/site', icon: Globe },
		],
	},
];

export function SuperAdminShell(props: {
	children: ReactNode;
	user: AuthUser;
	isOrganizer: boolean;
	defaultOpen?: boolean;
}) {
	return (
		<SidebarProvider defaultOpen={props.defaultOpen} data-admin-theme="neutral">
			<SuperAdminWorkspace {...props} />
		</SidebarProvider>
	);
}

function SuperAdminWorkspace({
	children,
	user,
	isOrganizer,
}: {
	children: ReactNode;
	user: AuthUser;
	isOrganizer: boolean;
}) {
	const { access } = usePlatformPermissions();
	const groups = navigationGroups
		.map((group) => ({ ...group, items: group.items.filter((item) => canVisitPlatformPath(access, item.href)) }))
		.filter((group) => group.items.length);
	const userName = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;
	const pathname = usePathname();
	const router = useRouter();
	const { setOpenMobile } = useSidebar();
	const active = (item: NavigationItem) =>
		item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		router.push('/login');
		router.refresh();
	}

	return (
		<>
			<Sidebar collapsible="icon">
				<SidebarHeader>
					<SidebarTrigger className="self-end md:hidden" aria-label="Fechar navegação" />
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild size="lg" tooltip="Events Manager">
								<Link href={preferredPlatformPath(access)} onClick={() => setOpenMobile(false)}>
									<ShieldCheck />
									<span className="group-data-[collapsible=icon]:sr-only">
										<span className="block font-semibold">Events Manager</span>
										<span className="block text-xs text-muted-foreground">Administração da plataforma</span>
									</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<nav aria-label="Navegação do super admin">
						{groups.map((group) => (
							<SidebarGroup key={group.label}>
								<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
								<SidebarMenu>
									{group.items.map((item) => (
										<SidebarMenuItem key={item.href}>
											<SidebarNavLink href={item.href} label={item.label} icon={item.icon} active={active(item)} />
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroup>
						))}
					</nav>
				</SidebarContent>
				<SidebarFooter>
					<SidebarMenu>
						{isOrganizer && (
							<SidebarMenuItem>
								<SidebarNavLink href="/admin" label="Painel do organizador" icon={CalendarDays} />
							</SidebarMenuItem>
						)}
						<SidebarMenuItem>
							<SidebarMenuButton tooltip="Sair" aria-label="Sair" className="sidebar-nav-link h-10" onClick={logout}>
								<LogOut aria-hidden="true" data-sidebar-icon />
								<span className="group-data-[collapsible=icon]:sr-only">Sair</span>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarFooter>
				<SidebarRail />
			</Sidebar>
			<SidebarInset className="min-w-0" id="main-content" tabIndex={-1}>
				<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background px-4 py-3 sm:px-6 lg:px-8">
					<div className="flex min-w-0 items-center gap-3">
						<SidebarTrigger />
						<Separator orientation="vertical" className="h-6" />
						<div className="min-w-0">
							<p className="text-xs font-semibold text-primary">Super admin</p>
							<p className="truncate text-sm text-muted-foreground">{userName}</p>
						</div>
					</div>
					<div className="flex shrink-0 items-center gap-3">
						<WorkspaceSwitcher area="platform" isSuperAdmin={Boolean(access?.active)} isOrganizer={isOrganizer} />
						<Badge variant="secondary" className="hidden gap-2 sm:flex">
							<ShieldCheck className="size-4" />
							{access?.isRoot ? 'Super-admin principal' : 'Acesso por permissões'}
						</Badge>
						<UserMenu user={user} onLogout={logout} isOrganizer={isOrganizer} isSuperAdmin />
					</div>
				</header>
				<div className="w-full p-4 sm:p-6 lg:p-8">{children}</div>
			</SidebarInset>
		</>
	);
}
