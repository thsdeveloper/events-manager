'use client';

import { Building2, Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
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
				'relative flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-950 text-white',
				className,
			)}
		>
			{url ? (
				<Image src={url} alt="" fill sizes="44px" className="object-contain p-1" unoptimized />
			) : (
				<Building2 className="size-6" />
			)}
		</div>
	);
}

interface OrganizationSwitcherProps {
	organizations: OrganizationOption[];
	activeId: string;
}

export function OrganizationSwitcher({ organizations, activeId }: OrganizationSwitcherProps) {
	const router = useRouter();
	const { toast } = useToast();
	const [switching, setSwitching] = useState<string | null>(null);

	const active = organizations.find((item) => item.id === activeId) ?? organizations[0];

	const activate = useCallback(
		async (id: string) => {
			if (id === activeId) return;
			setSwitching(id);
			try {
				const response = await fetch(`/api/organizer/organizations/${id}/activate`, {
					method: 'POST',
					credentials: 'include',
				});
				if (!response.ok) throw new Error('Não foi possível trocar de organização.');
				// Every admin screen is scoped to the active organization, so the whole
				// tree is refetched rather than patched piecemeal.
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
		[activeId, router, toast],
	);

	if (!active) return null;

	return (
		<>
			<DropdownMenu>
				<DropdownMenuTrigger className="flex w-full items-center gap-3 rounded-lg p-1 text-left transition-colors hover:bg-slate-50">
					<OrganizationMark organization={active} />
					<div className="min-w-0 flex-1">
						<p className="truncate text-sm font-bold text-slate-950">{active.name}</p>
						<p className="text-xs text-slate-500">
							{organizations.length > 1 ? `${organizations.length} organizações` : 'Workspace do organizador'}
						</p>
					</div>
					<ChevronsUpDown className="size-4 shrink-0 text-slate-400" />
				</DropdownMenuTrigger>

				<DropdownMenuContent align="start" className="w-64">
					{organizations.map((organization) => (
						<DropdownMenuItem key={organization.id} onClick={() => activate(organization.id)} className="gap-2 py-2">
							<OrganizationMark organization={organization} className="size-7 rounded-md" />
							<span className="min-w-0 flex-1">
								<span className="block truncate text-sm font-medium">{organization.name}</span>
								{organization.status !== 'active' && <span className="block text-xs text-amber-600">Em análise</span>}
							</span>
							{switching === organization.id ? (
								<Loader2 className="size-4 shrink-0 animate-spin" />
							) : (
								organization.id === activeId && <Check className="size-4 shrink-0 text-violet-600" />
							)}
						</DropdownMenuItem>
					))}
				</DropdownMenuContent>
			</DropdownMenu>
		</>
	);
}
