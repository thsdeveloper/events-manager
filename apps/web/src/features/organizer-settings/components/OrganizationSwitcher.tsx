'use client';

import { SidebarMenuButton } from '@/components/ui/sidebar';
import { Spinner } from '@/components/ui/spinner';
import { Building2, Check, ChevronsUpDown, Plus } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { getMediaAssetUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

export interface OrganizationOption {
	id: string;
	name: string;
	status: string;
	logo?: string | { id: string } | null;
}

function logoUrlOf(organization: OrganizationOption) {
	const id = typeof organization.logo === 'string' ? organization.logo : organization.logo?.id;

	return id ? getMediaAssetUrl(id) : null;
}

function OrganizationMark({ organization, className }: { organization: OrganizationOption; className?: string }) {
	const url = logoUrlOf(organization);

	return (
		<div
			className={cn(
				'relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-foreground text-white',
				className,
			)}
		>
			{url ? (
				<Image src={url} alt="" fill sizes="44px" className="object-cover" unoptimized />
			) : (
				<Building2 className="size-6" />
			)}
		</div>
	);
}

interface OrganizationSwitcherProps {
	organizations: OrganizationOption[];
	activeId: string;
	sidebar?: boolean;
	onNavigate?: () => void;
}

export function OrganizationSwitcher({
	organizations,
	activeId,
	sidebar = false,
	onNavigate,
}: OrganizationSwitcherProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [switching, setSwitching] = useState<string | null>(null);

	const active = organizations.find((item) => item.id === activeId) ?? organizations[0];

	const activate = useCallback(
		async (id: string) => {
			setSwitching(id);
			try {
				const response = await fetch(`/api/organizer/organizations/${id}/activate`, {
					method: 'POST',
					credentials: 'include',
				});
				if (!response.ok) throw new Error('Não foi possível trocar de organização.');
				// Every admin screen is scoped to the active organization, so the whole
				// tree is refetched rather than patched piecemeal.
				onNavigate?.();
				router.replace('/admin');
				router.refresh();
			} catch (error) {
				toast({
					title: 'Erro ao trocar',
					description: error instanceof Error ? error.message : 'Tente novamente.',
					variant: 'destructive',
				});
			} finally {
				setSwitching(null);
			}
		},
		[router, toast, onNavigate],
	);

	if (!active) return null;
	const Trigger = sidebar ? SidebarMenuButton : 'button';

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Trigger
						aria-label={`Organização: ${active.name}`}
						className="flex h-auto min-h-12 w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-muted group-data-[collapsible=icon]:!size-8 group-data-[collapsible=icon]:min-h-0 group-data-[collapsible=icon]:!p-0"
					>
						<OrganizationMark organization={active} className="group-data-[collapsible=icon]:size-8" />
						<div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
							<p className="truncate text-sm font-semibold text-foreground">{active.name}</p>
							<p className="text-xs text-muted-foreground">
								{organizations.length > 1 ? `${organizations.length} organizações` : 'Workspace do organizador'}
							</p>
						</div>
						<ChevronsUpDown className="size-4 shrink-0 text-muted-foreground group-data-[collapsible=icon]:hidden" />
					</Trigger>
				</DropdownMenuTrigger>

				<DropdownMenuContent align="start" className="w-64">
					{organizations.map((organization) => (
						<DropdownMenuItem
							key={organization.id}
							disabled={organization.status !== 'active' || Boolean(switching)}
							onSelect={() => activate(organization.id)}
							className="gap-2 py-2"
						>
							<OrganizationMark organization={organization} className="size-7 rounded-md" />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-medium">{organization.name}</span>
								{organization.status !== 'active' && (
									<span className="block text-xs text-muted-foreground">
										{organization.status === 'pending' ? 'Em análise' : 'Arquivada'}
									</span>
								)}
							</span>
							{switching === organization.id ? (
								<Spinner className="size-4 shrink-0 animate-spin" />
							) : (
								organization.id === activeId && <Check className="size-4 shrink-0 text-primary" />
							)}
						</DropdownMenuItem>
					))}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						disabled={Boolean(switching)}
						onSelect={() => {
							onNavigate?.();
							router.push('/perfil/organizador/novo');
						}}
						className="gap-2 py-2"
					>
						<Plus className="size-4" aria-hidden="true" />
						Cadastrar nova conta
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
