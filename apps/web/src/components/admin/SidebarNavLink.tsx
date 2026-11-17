'use client';

import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';

export function SidebarNavLink({
	href,
	label,
	icon: Icon,
	active = false,
}: {
	href: string;
	label: string;
	icon: LucideIcon;
	active?: boolean;
}) {
	const { setOpenMobile } = useSidebar();

	return (
		<SidebarMenuButton asChild isActive={active} tooltip={label} className="sidebar-nav-link h-10 gap-3">
			<Link
				href={href}
				aria-label={label}
				aria-current={active ? 'page' : undefined}
				onClick={() => setOpenMobile(false)}
			>
				<Icon aria-hidden="true" data-sidebar-icon />
				<span className="group-data-[collapsible=icon]:sr-only">{label}</span>
			</Link>
		</SidebarMenuButton>
	);
}
