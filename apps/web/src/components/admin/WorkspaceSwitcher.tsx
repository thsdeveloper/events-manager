'use client';

import Link from 'next/link';
import { ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface WorkspaceSwitcherProps {
	area: 'organizer' | 'platform';
	isSuperAdmin: boolean;
	isOrganizer: boolean;
}
export function WorkspaceSwitcher({ area, isSuperAdmin, isOrganizer }: WorkspaceSwitcherProps) {
	if (!isSuperAdmin) return null;
	const href = area === 'organizer' ? '/super-admin' : isOrganizer ? '/admin/dashboard' : '/perfil/organizador';
	const label =
		area === 'organizer' ? 'Painel superadmin' : isOrganizer ? 'Painel do organizador' : 'Organizar eventos';

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Button asChild variant="outline" size="sm" className="shrink-0">
						<Link href={href} aria-label={label}>
							<ArrowLeftRight aria-hidden="true" className="size-4" />
							<span className="hidden sm:inline">{label}</span>
						</Link>
					</Button>
				</TooltipTrigger>
				<TooltipContent>{label}</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}
