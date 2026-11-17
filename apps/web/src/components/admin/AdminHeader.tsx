'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import type { AuthUser, OrganizerProfile } from '@/lib/auth/server-auth';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { UserMenu } from '@/components/layout/UserMenu';

export default function AdminHeader({
	user,
	organizer,
}: {
	user: AuthUser;
	organizer: OrganizerProfile;
	title?: string;
}) {
	const router = useRouter();
	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
		router.push('/login');
		router.refresh();
	}

	// Anything that sticks below this header needs its height. Publishing the
	// measured value beats hardcoding it: the header grows when a long organizer
	// name wraps, and a stale constant silently overlaps whatever sits underneath.
	const headerRef = useRef<HTMLElement>(null);
	useEffect(() => {
		const header = headerRef.current;
		if (!header || typeof ResizeObserver === 'undefined') return;
		const publishHeight = () =>
			document.documentElement.style.setProperty(
				'--admin-header-height',
				`${Math.round(header.getBoundingClientRect().height)}px`,
			);
		publishHeight();
		const observer = new ResizeObserver(publishHeight);
		observer.observe(header);

		return () => {
			observer.disconnect();
			document.documentElement.style.removeProperty('--admin-header-height');
		};
	}, []);

	return (
		<header ref={headerRef} className="sticky top-0 z-30 border-b bg-background px-4 py-3 sm:px-6 lg:px-8">
			<div className="flex w-full items-center justify-between gap-3">
				<div className="flex min-w-0 items-center gap-3">
					<SidebarTrigger />
					<Separator orientation="vertical" className="h-6" />
					<div className="min-w-0">
						<p className="truncate text-sm font-medium">{organizer.name}</p>
						<p className="text-xs text-muted-foreground">Gestão de eventos</p>
					</div>
				</div>
				<div className="flex shrink-0 items-center gap-3">
					<WorkspaceSwitcher area="organizer" isSuperAdmin={user.role === 'super_admin'} isOrganizer />
					<UserMenu user={user} onLogout={logout} isOrganizer isSuperAdmin={user.role === 'super_admin'} />
				</div>
			</div>
		</header>
	);
}
