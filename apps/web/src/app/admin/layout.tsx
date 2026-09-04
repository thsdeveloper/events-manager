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
		<ReactQueryProvider>
			<div className="min-h-screen bg-slate-50 dark:bg-slate-950">
				{/* Sidebar */}
				<AdminSidebar organizer={organizer} organizations={organizations} />

				{/* Main Content Area */}
				<div className="lg:pl-72">
					{/* Header */}
					<AdminHeader user={user} organizer={organizer} />

					{/* Page Content */}
					<main className="p-4 sm:p-6 lg:p-8" id="main-content" tabIndex={-1}>
						{/* No width cap: the workspace content fills whatever the viewport
						    gives it, matching the header above. */}
						<div className="w-full">{children}</div>
					</main>
				</div>
			</div>
		</ReactQueryProvider>
	);
}
