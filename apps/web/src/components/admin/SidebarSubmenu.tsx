'use client';

import { Collapsible } from '@base-ui/react/collapsible';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
	SidebarMenuItem,
	SidebarMenuButton,
	SidebarMenuAction,
	SidebarMenuBadge,
	SidebarMenuSub,
	SidebarMenuSubItem,
	SidebarMenuSubButton,
	useSidebar,
} from '@/components/ui/sidebar';
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuItem,
	DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type Destination = { label: string; href: string; icon: LucideIcon; exact?: boolean };

/** Receives only destinations already authorized by the workspace's permission policy. */
export function SidebarSubmenu({
	label,
	icon: Icon,
	items,
	pathname,
	action,
}: {
	label: string;
	icon: LucideIcon;
	items: Destination[];
	pathname: string;
	action?: Destination;
}) {
	const { state, isMobile, setOpenMobile, theme } = useSidebar();
	const [open, setOpen] = useState(true);
	const isActive = (item: Destination) =>
		!item.href.includes('#') && (pathname === item.href || (!item.exact && pathname.startsWith(`${item.href}/`)));
	const active = items.some(isActive);
	// Navigating into the section reveals its current destination, even after it was collapsed.
	useEffect(() => {
		if (active) setOpen(true);
	}, [pathname, active]);
	const closeMobile = () => setOpenMobile(false);
	if (!items.length) return null;

	if (state === 'collapsed' && !isMobile) {
		return (
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton aria-label={label} tooltip={label} isActive={active} className="sidebar-nav-link h-10">
							<Icon aria-hidden="true" />
							<span className="sr-only">{label}</span>
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent side="right" align="start" sideOffset={12} className="w-60" data-admin-theme={theme}>
						<DropdownMenuLabel>{label}</DropdownMenuLabel>
						{items.map((item) => (
							<DropdownMenuItem key={item.href} asChild>
								<Link href={item.href} aria-current={isActive(item) ? 'page' : undefined} onClick={closeMobile}>
									<item.icon aria-hidden="true" />
									<span>{item.label}</span>
								</Link>
							</DropdownMenuItem>
						))}
						{action && (
							<>
								<DropdownMenuSeparator />
								<DropdownMenuItem asChild>
									<Link href={action.href} onClick={closeMobile}>
										<action.icon aria-hidden="true" />
										{action.label}
									</Link>
								</DropdownMenuItem>
							</>
						)}
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		);
	}

	return (
		<Collapsible.Root open={open} onOpenChange={setOpen} render={<SidebarMenuItem />}>
			<SidebarMenuButton
				render={<Collapsible.Trigger />}
				aria-label={label}
				isActive={active}
				className={cn('sidebar-nav-link h-10 gap-3', action ? 'pr-20' : 'pr-14')}
			>
				<Icon aria-hidden="true" />
				<span className="truncate">{label}</span>
				<ChevronRight
					aria-hidden="true"
					className={cn('ml-auto transition-transform motion-reduce:transition-none', open && 'rotate-90')}
				/>
			</SidebarMenuButton>
			<SidebarMenuBadge
				className={cn('top-2.5', action ? 'right-7' : 'right-1')}
				aria-label={`${items.length} ${items.length === 1 ? 'opção' : 'opções'} de ${label}`}
			>
				{items.length}
			</SidebarMenuBadge>
			{action && (
				<SidebarMenuAction
					render={<Link href={action.href} onClick={closeMobile} />}
					aria-label={action.label}
					title={action.label}
					className="top-2.5"
				>
					<action.icon aria-hidden="true" />
				</SidebarMenuAction>
			)}
			<Collapsible.Panel className="overflow-hidden">
				<SidebarMenuSub className="my-1">
					{items.map((item) => (
						<SidebarMenuSubItem key={item.href}>
							<SidebarMenuSubButton
								render={<Link href={item.href} onClick={closeMobile} />}
								isActive={isActive(item)}
								aria-current={isActive(item) ? 'page' : undefined}
								className="h-9"
							>
								<item.icon aria-hidden="true" />
								<span>{item.label}</span>
							</SidebarMenuSubButton>
						</SidebarMenuSubItem>
					))}
				</SidebarMenuSub>
			</Collapsible.Panel>
		</Collapsible.Root>
	);
}
