import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { permissionDefinitions, platformPermissionDefinitions } from '@events-manager/contracts';
import { PermissionContext } from '../src/components/auth/PermissionsProvider';
import { PlatformPermissionContext } from '../src/features/platform-access/PlatformPermissions';
import AdminSidebar from '../src/components/admin/AdminSidebar';
import { SuperAdminShell } from '../src/features/super-admin/components/SuperAdminShell';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '../src/components/ui/sidebar';
import '../src/styles/globals.css';
const params = new URLSearchParams(location.search);
const organizations = [
	{ id: 'fixture', name: 'Instituto Marketcoaching do Brasil', status: 'active' },
	{ id: 'other', name: 'Flouvi Eventos', status: 'active' },
];
const content = (
	<div style={{ padding: 32 }}>
		<h1 style={{ fontSize: 28, fontWeight: 600 }}>Visão geral</h1>
		<p>Validação da navegação dos painéis</p>
		<div style={{ marginTop: 24, border: '1px solid #ddd', borderRadius: 12, padding: 24 }}>Conteúdo da página</div>
		<div style={{ height: 1600 }} />
	</div>
);
createRoot(document.getElementById('root')!).render(
	<QueryClientProvider client={new QueryClient()}>
		{params.has('platform') ? (
			<PlatformPermissionContext.Provider
				value={{
					userId: 'fixture',
					active: true,
					isRoot: !params.has('limited'),
					permissions: params.has('limited')
						? ['platform_pages.read']
						: platformPermissionDefinitions.map((p) => p.key),
				}}
			>
				<SuperAdminShell
					defaultOpen={!document.cookie.includes('sidebar_state=false')}
					user={
						{
							id: 'fixture',
							email: 'ana@example.test',
							first_name: 'Ana',
							last_name: 'Silva',
							role: 'super_admin',
							avatar: null,
						} as never
					}
					isOrganizer
				>
					{content}
				</SuperAdminShell>
			</PlatformPermissionContext.Provider>
		) : (
			<PermissionContext.Provider
				value={{
					userId: 'fixture',
					organizationId: 'fixture',
					active: true,
					isOwner: !params.has('limited'),
					permissions: params.has('limited')
						? ['events.read', 'participants.read']
						: permissionDefinitions.map((p) => p.key),
					events: [],
				}}
			>
				<SidebarProvider defaultOpen={!document.cookie.includes('sidebar_state=false')} data-admin-theme="neutral">
					<AdminSidebar organizer={organizations[0] as never} organizations={organizations} eventCount={12} />
					<SidebarInset className="min-w-0">
						<header className="sticky top-0 z-30 flex items-center gap-4 border-b bg-background p-4">
							<SidebarTrigger />
							<span>Todos os eventos</span>
						</header>
						{content}
					</SidebarInset>
				</SidebarProvider>
			</PermissionContext.Provider>
		)}
	</QueryClientProvider>,
);
