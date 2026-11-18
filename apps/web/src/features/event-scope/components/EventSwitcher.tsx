'use client';

import { CalendarDays, ChevronsUpDown } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuLabel,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Spinner } from '@/components/ui/spinner';
import { selectionDestination } from '../lib/selection-destination';
import { selectEvent } from '../api/selectEvent';
import type { EventSelection } from '../types';

export function EventSwitcher({
	selection,
	organizationName,
}: {
	selection: EventSelection;
	organizationName: string;
}) {
	const router = useRouter();
	const pathname = usePathname();
	const params = useSearchParams();
	const [saving, setSaving] = useState(false);
	const [pending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const current = selection.events.find((event) => event.id === selection.selectedEventId);
	const label = current?.title ?? 'Todos os eventos';
	const busy = saving || pending;

	async function select(value: string) {
		const eventId = value === 'all' ? null : value;
		if (eventId === selection.selectedEventId || busy) return;
		setSaving(true);
		setError(null);
		try {
			await selectEvent(eventId);
			startTransition(() => {
				router.replace(selectionDestination(pathname, params.toString(), eventId));
				router.refresh();
			});
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível trocar de evento.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="min-w-0">
			<DropdownMenu>
				<DropdownMenuTrigger
					disabled={busy}
					aria-label={`Selecionar evento: ${label}`}
					aria-busy={busy}
					className="flex max-w-full items-center gap-2 rounded-md px-2 py-1 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
				>
					<CalendarDays aria-hidden className="hidden size-4 shrink-0 text-muted-foreground sm:block" />
					<span className="min-w-0">
						<span className="block truncate text-sm font-medium">{label}</span>
						<span className="block truncate text-xs text-muted-foreground">{organizationName}</span>
					</span>
					{busy ? (
						<Spinner className="size-4 shrink-0" />
					) : (
						<ChevronsUpDown aria-hidden className="size-4 shrink-0 text-muted-foreground" />
					)}
				</DropdownMenuTrigger>
				<DropdownMenuContent align="start" className="max-h-80 w-80 max-w-[calc(100vw-2rem)] overflow-y-auto">
					<DropdownMenuLabel>Visualizar evento</DropdownMenuLabel>
					<DropdownMenuRadioGroup value={selection.selectedEventId ?? 'all'} onValueChange={select}>
						<DropdownMenuRadioItem value="all">Todos os eventos</DropdownMenuRadioItem>
						<DropdownMenuSeparator />
						{selection.events.map((event) => (
							<DropdownMenuRadioItem key={event.id} value={event.id} className="items-start whitespace-normal">
								{event.title}
							</DropdownMenuRadioItem>
						))}
					</DropdownMenuRadioGroup>
					{selection.events.length === 0 && (
						<p className="px-2 py-3 text-sm text-muted-foreground">Nenhum evento cadastrado</p>
					)}
				</DropdownMenuContent>
			</DropdownMenu>
			{error && (
				<p role="alert" className="mt-1 text-xs text-destructive">
					{error}
				</p>
			)}
		</div>
	);
}
