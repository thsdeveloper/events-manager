'use client';

import type { AppUser } from '@events-manager/contracts';
import Link from 'next/link';
import { Compass } from '@/components/animate-ui/icons/compass';
import { CreditCard } from '@/components/animate-ui/icons/credit-card';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { Key } from '@/components/animate-ui/icons/key';
import { LayoutDashboard } from '@/components/animate-ui/icons/layout-dashboard';
import { LogOut } from '@/components/animate-ui/icons/log-out';
import { SlidersHorizontal } from '@/components/animate-ui/icons/sliders-horizontal';
import { Ticket } from '@/components/animate-ui/icons/ticket';
import { UserRound } from '@/components/animate-ui/icons/user-round';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { getMediaAssetUrl } from '@/lib/media';
import { profileSectionHref } from '@/lib/profile-sections';
import { getDisplayName, getInitials, type DisplayableUser } from '@/lib/user-display';
import { cn } from '@/lib/utils';

type UserMenuUser = DisplayableUser & Pick<AppUser, 'avatar' | 'role'>;

interface UserMenuProps {
	user: UserMenuUser;
	onLogout: () => Promise<void>;
	className?: string;
}

interface MenuLink {
	href: string;
	label: string;
	icon: React.ComponentType<{ className?: string }>;
}

// Same entries, order and icons as the profile sidebar (ProfileNavigation), so
// the dropdown and the page it leads to describe the account the same way.
// Hrefs carry the `?section=` value that ProfilePageClient reads.
const accountLinks: MenuLink[] = [
	{ href: profileSectionHref('overview'), icon: LayoutDashboard, label: 'Visão geral' },
	{ href: profileSectionHref('personal'), icon: UserRound, label: 'Dados pessoais' },
	{ href: profileSectionHref('security'), icon: Key, label: 'Segurança' },
	{ href: profileSectionHref('preferences'), icon: SlidersHorizontal, label: 'Preferências' },
];

const activityLinks: MenuLink[] = [
	{ href: profileSectionHref('ingressos'), icon: Ticket, label: 'Meus ingressos' },
	{ href: profileSectionHref('payments'), icon: CreditCard, label: 'Pagamentos' },
	{ href: '/eventos', icon: Compass, label: 'Explorar eventos' },
];

function roleLabel(role: UserMenuUser['role']) {
	if (role === 'admin' || role === 'super_admin') return 'Administrador';
	if (role === 'organizer') return 'Organizador';

	return 'Participante';
}

export function UserMenu({ user, onLogout, className }: UserMenuProps) {
	const displayName = getDisplayName(user);
	const avatarUrl = getMediaAssetUrl(user.avatar);

	return (
		<DropdownMenu>
			{/* `rounded-full` on the trigger, not just the avatar: the global
			    focus-visible ring is drawn on the button box, and a square ring
			    around a round avatar looks like a rendering bug. */}
			<DropdownMenuTrigger aria-label={`Conta de ${displayName}`} className={cn('rounded-full', className)}>
				<Avatar className="size-9 border border-border transition-opacity hover:opacity-80">
					{avatarUrl ? <AvatarImage alt="" src={avatarUrl} /> : null}
					<AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
						{getInitials(user)}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>

			<DropdownMenuContent align="end" className="w-64">
				<div className="px-2 py-2.5">
					<p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
					<p className="truncate text-xs text-muted-foreground">{user.email || roleLabel(user.role)}</p>
				</div>

				<DropdownMenuSeparator />

				{accountLinks.map((link) => (
					<UserMenuLink key={link.href} link={link} />
				))}

				<DropdownMenuSeparator />
				<DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
					Sua atividade
				</DropdownMenuLabel>

				{activityLinks.map((link) => (
					<UserMenuLink key={link.href} link={link} />
				))}

				<DropdownMenuSeparator />

				<AnimateIcon animateOnHover asChild>
					<DropdownMenuItem
						className="gap-3 text-destructive focus:text-destructive"
						onSelect={() => void onLogout()}
					>
						<LogOut className="size-4" />
						Sair da conta
					</DropdownMenuItem>
				</AnimateIcon>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}

function UserMenuLink({ link }: { link: MenuLink }) {
	const Icon = link.icon;

	// `asChild` keeps Link's client-side navigation while the item still closes
	// the menu and stays keyboard-navigable.
	return (
		<AnimateIcon animateOnHover asChild>
			<DropdownMenuItem asChild className="gap-3">
				<Link href={link.href}>
					<Icon className="size-4" />
					{link.label}
				</Link>
			</DropdownMenuItem>
		</AnimateIcon>
	);
}

export default UserMenu;
