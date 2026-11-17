'use client';

import { UserMenu } from '@/components/layout/UserMenu';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
	useSidebar,
} from '@/components/ui/sidebar';
import type { AuthUser } from '@/lib/auth/server-auth';
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
	Settings2,
	ShieldCheck,
	Tags,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ReactNode } from 'react';

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

export function SuperAdminShell(props: { children: ReactNode; user: AuthUser; isOrganizer: boolean }) {
	return (
		<SidebarProvider>
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
			<Sidebar>
				<SidebarHeader className="border-b p-4">
					<SidebarMenu>
						<SidebarMenuItem>
							<SidebarMenuButton asChild size="lg">
								<Link href="/super-admin" onClick={() => setOpenMobile(false)}>
									<ShieldCheck className="text-primary" />
									<span>
										<span className="block font-semibold">Events Manager</span>
										<span className="text-xs text-muted-foreground">Administração da plataforma</span>
									</span>
								</Link>
							</SidebarMenuButton>
						</SidebarMenuItem>
					</SidebarMenu>
				</SidebarHeader>
				<SidebarContent>
					<nav aria-label="Navegação do super admin">
						{navigationGroups.map((group) => (
							<SidebarGroup key={group.label}>
								<SidebarGroupLabel>{group.label}</SidebarGroupLabel>
								<SidebarMenu>
									{group.items.map((item) => (
										<SidebarMenuItem key={item.href}>
											<SidebarMenuButton asChild isActive={active(item)}>
												<Link
													href={item.href}
													aria-current={active(item) ? 'page' : undefined}
													onClick={() => setOpenMobile(false)}
												>
													<item.icon aria-hidden="true" />
													<span>{item.label}</span>
												</Link>
											</SidebarMenuButton>
										</SidebarMenuItem>
									))}
								</SidebarMenu>
							</SidebarGroup>
						))}
					</nav>
				</SidebarContent>
				<SidebarFooter className="border-t p-4">
					{isOrganizer && (
						<Button asChild variant="outline">
							<Link href="/admin">
								<CalendarDays />
								Painel do organizador
							</Link>
						</Button>
					)}
					<Button variant="ghost" onClick={logout} className="justify-start">
						<LogOut />
						Sair
					</Button>
				</SidebarFooter>
			</Sidebar>
			<SidebarInset className="min-w-0 bg-background" id="main-content" tabIndex={-1}>
				<header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
					<div className="flex min-w-0 items-center gap-3">
						<SidebarTrigger />
						<Separator orientation="vertical" className="h-6" />
						<div className="min-w-0">
							<p className="text-xs font-semibold text-primary">Super admin</p>
							<p className="truncate text-sm">{userName}</p>
						</div>
					</div>
					<div className="flex items-center gap-3">
						<Badge variant="secondary" className="hidden gap-1 sm:inline-flex">
							<ShieldCheck className="size-3" />
							Acesso global
						</Badge>
						<UserMenu user={user} onLogout={logout} isOrganizer={isOrganizer} isSuperAdmin />
					</div>
				</header>
				<div className="w-full p-4 sm:p-6 lg:p-8">{children}</div>
			</SidebarInset>
		</>
	);
}
