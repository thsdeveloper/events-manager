import { PermissionsProvider, PermissionBoundary } from '@/components/auth/PermissionsProvider';
import { getServerPermissions } from '@/lib/auth/server-permissions';
import { cookies } from 'next/headers';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import { AdminEventScope } from '@/features/event-scope/components/AdminEventScope';
import { getEventSelection } from '@/features/event-scope/api/getEventSelection';
import { requireOrganizer } from '@/lib/auth/server-auth';
import React from 'react';
import type { OrganizationOption } from '@/features/organizer-settings/components/OrganizationSwitcher';
import { authenticatedBackendFetch } from '@/lib/backend-auth';

/**
 * Admin Area Layout (Server Component)
 *
 * Protected workspace for organization owners and authorized team members.
 * Users without an active organization are redirected to their profile.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
	// Validate identity and active organization before resolving live permissions.
	const { user, organizer } = await requireOrganizer();
	// Include owned organizations and active team memberships in the switcher.
	const [{ data: organizations }, selection, access] = await Promise.all([
		authenticatedBackendFetch<{ data: OrganizationOption[] }>('/api/organizer/organizations').catch(() => ({
			data: [organizer as unknown as OrganizationOption],
		})),
		getEventSelection(),
		getServerPermissions(),
	]);

	return (
		<PermissionsProvider key={`${user.id}:${organizer.id}`} initialAccess={access} organizationId={organizer.id}>
			<AdminEventScope scopeKey={`${user.id}:${organizer.id}`} selection={selection}>
				<SidebarProvider
					defaultOpen={(await cookies()).get('sidebar_state')?.value !== 'false'}
					data-admin-theme="neutral"
				>
					{/* Sidebar */}
					<AdminSidebar organizer={organizer} organizations={organizations} />

					{/* Main Content Area */}
					<SidebarInset className="min-w-0" id="main-content" tabIndex={-1}>
						{/* Header */}
						<AdminHeader user={user} organizer={organizer} eventSelection={selection} />

						{/* Page Content */}
						<div className="p-4 sm:p-6 lg:p-8">
							{/* No width cap: the workspace content fills whatever the viewport
						    gives it, matching the header above. */}
							<div className="w-full">
								<PermissionBoundary>{children}</PermissionBoundary>
							</div>
						</div>
					</SidebarInset>
				</SidebarProvider>
			</AdminEventScope>
		</PermissionsProvider>
	);
}
