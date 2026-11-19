'use client';

import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';

export function SidebarNavLink({
	href,
	label,
	icon: Icon,
	active = false,
	className,
}: {
	href: string;
	label: string;
	icon: LucideIcon;
	active?: boolean;
	className?: string;
}) {
	const { setOpenMobile } = useSidebar();

	return (
		<SidebarMenuButton
			render={
				<Link
					href={href}
					aria-label={label}
					aria-current={active ? 'page' : undefined}
					onClick={() => setOpenMobile(false)}
				/>
			}
			isActive={active}
			tooltip={label}
			className={cn('sidebar-nav-link h-10 gap-3', className)}
		>
			<Icon aria-hidden="true" data-sidebar-icon />
			<span className="group-data-[collapsible=icon]:sr-only">{label}</span>
		</SidebarMenuButton>
	);
}
