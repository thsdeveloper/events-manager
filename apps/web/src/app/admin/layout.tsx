import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { ReactQueryProvider } from '@/contexts/ReactQueryProvider';
import { requireOrganizer } from '@/lib/auth/server-auth';
import React from 'react';
import type { OrganizationOption } from '@/features/organizer-settings/components/OrganizationSwitcher';
import { authenticatedBackendFetch } from '@/lib/backend-auth';

/**
 * Admin Area Layout (Server Component)
 *
 * Protected area exclusively for organizers to manage events
 * Regular users are automatically redirected to their profile
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	// ⭐ SSR Authentication - validates organizer role
	const { user, organizer } = await requireOrganizer();
	// The switcher needs every organization the user owns, not just the active one.
	const { data: organizations } = await authenticatedBackendFetch<{ data: OrganizationOption[] }>(
		'/api/organizer/organizations',
	).catch(() => ({ data: [organizer as unknown as OrganizationOption] }));

	return (
		<ReactQueryProvider key={`${user.id}:${organizer.id}`}>
			<SidebarProvider
				defaultOpen={(await cookies()).get('sidebar_state')?.value !== 'false'}
				data-admin-theme="neutral"
			>
				{/* Sidebar */}
				<AdminSidebar organizer={organizer} organizations={organizations} />

				{/* Main Content Area */}
				<SidebarInset className="min-w-0" id="main-content" tabIndex={-1}>
					{/* Header */}
					<AdminHeader user={user} organizer={organizer} />

					{/* Page Content */}
					<div className="p-4 sm:p-6 lg:p-8">
						{/* No width cap: the workspace content fills whatever the viewport
						    gives it, matching the header above. */}
						<div className="w-full">{children}</div>
					</div>
				</SidebarInset>
			</SidebarProvider>
		</ReactQueryProvider>
	);
}
