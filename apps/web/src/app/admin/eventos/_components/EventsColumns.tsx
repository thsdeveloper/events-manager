'use client';

import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye, MoreHorizontal, Pencil } from 'lucide-react';
import Link from 'next/link';
import { Event } from '@events-manager/contracts';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { DeleteEventDialog } from './DeleteEventDialog';

export type EventWithStats = {
	event: Event;
	participantsCount: number;
};

const formatDate = (dateString: string | null | undefined) => {
	if (!dateString) return 'Não definida';

	const date = new Date(dateString);
	
return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
	});
};

const formatDateTime = (dateString: string | null | undefined) => {
	if (!dateString) return 'Não definida';

	const date = new Date(dateString);
	
return date.toLocaleDateString('pt-BR', {
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

const getStatusBadge = (status?: string) => {
	const statusMap: Record<string, { label: string; className: string }> = {
		published: {
			label: 'Publicado',
			className:
				'border-transparent bg-emerald-500/10 text-emerald-700 shadow-none dark:bg-emerald-400/10 dark:text-emerald-200',
		},
		draft: {
			label: 'Rascunho',
			className:
				'border-transparent bg-muted text-muted-foreground shadow-none dark:bg-muted/40 dark:text-muted-foreground',
		},
		cancelled: {
			label: 'Cancelado',
			className: 'border-transparent bg-red-500/10 text-red-600 shadow-none dark:bg-red-500/20 dark:text-red-200',
		},
		archived: {
			label: 'Arquivado',
			className:
				'border-transparent bg-amber-500/10 text-amber-700 shadow-none dark:bg-amber-500/20 dark:text-amber-200',
		},
	};

	const statusInfo = statusMap[status || 'draft'];

	return (
		<Badge
			variant="outline"
			className={cn('whitespace-nowrap border border-transparent text-xs font-medium', statusInfo.className)}
		>
			{statusInfo.label}
		</Badge>
	);
};

export const getEventsColumns = (onEventDeleted?: () => void): ColumnDef<EventWithStats>[] => [
	{
		id: 'title',
		accessorFn: (row) => row.event.title,
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
					Evento
					<ArrowUpDown className="ml-2 size-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const event = row.original.event;

return (
				<div className="min-w-[200px]">
					<Link
						href={`/admin/eventos/${event.id}`}
						className="font-medium hover:text-primary hover:underline"
					>
						{event.title}
					</Link>
					{event.short_description && (
						<p className="line-clamp-1 text-xs text-muted-foreground">{event.short_description}</p>
					)}
				</div>
			);
		},
	},
	{
		id: 'status',
		accessorFn: (row) => row.event.status,
		header: 'Status',
		cell: ({ row }) => {
			return getStatusBadge(row.original.event.status);
		},
		filterFn: (row, id, value) => {
			return value.includes(row.getValue(id));
		},
	},
	{
		id: 'event_type',
		accessorFn: (row) => row.event.event_type,
		header: 'Tipo',
		cell: ({ row }) => {
			const eventTypeMap: Record<string, { label: string; className: string }> = {
				online: {
					label: 'Online',
					className: 'border-blue-300 bg-blue-500/10 text-blue-600',
				},
				hybrid: {
					label: 'Híbrido',
					className: 'border-purple-300 bg-purple-500/10 text-purple-600',
				},
				in_person: {
					label: 'Presencial',
					className: 'border-green-300 bg-green-500/10 text-green-600',
				},
			};

			const eventType = row.original.event.event_type ?? '';
			const typeInfo = eventTypeMap[eventType] || { label: 'N/A', className: '' };

			return (
				<Badge variant="outline" className={cn('capitalize', typeInfo.className)}>
					{typeInfo.label}
				</Badge>
			);
		},
	},
	{
		id: 'start_date',
		accessorFn: (row) => row.event.start_date,
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
					Data do Evento
					<ArrowUpDown className="ml-2 size-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="text-sm">{formatDateTime(row.original.event.start_date)}</div>;
		},
	},
	{
		id: 'participantsCount',
		accessorFn: (row) => row.participantsCount,
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
					Participantes
					<ArrowUpDown className="ml-2 size-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			const count = row.original.participantsCount;
			const maxAttendees = row.original.event.max_attendees;

			return (
				<div className="text-center">
					<span className="font-medium">{count}</span>
					{maxAttendees && <span className="text-xs text-muted-foreground"> / {maxAttendees}</span>}
				</div>
			);
		},
	},
	{
		id: 'is_free',
		accessorFn: (row) => row.event.is_free,
		header: 'Gratuito',
		cell: ({ row }) => {
			return row.original.event.is_free ? (
				<Badge variant="outline" className="border-emerald-300 bg-emerald-500/10 text-emerald-600">
					Sim
				</Badge>
			) : (
				<Badge variant="outline" className="border-gray-300 bg-gray-500/10 text-gray-600">
					Não
				</Badge>
			);
		},
	},
	{
		id: 'featured',
		accessorFn: (row) => row.event.featured,
		header: 'Destaque',
		cell: ({ row }) => {
			return row.original.event.featured ? (
				<Badge variant="outline" className="border-primary/40 bg-primary/5 text-primary">
					Sim
				</Badge>
			) : (
				<span className="text-muted-foreground">-</span>
			);
		},
	},
	{
		id: 'date_created',
		accessorFn: (row) => row.event.date_created,
		header: ({ column }) => {
			return (
				<Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
					Criado em
					<ArrowUpDown className="ml-2 size-4" />
				</Button>
			);
		},
		cell: ({ row }) => {
			return <div className="text-sm text-muted-foreground">{formatDate(row.original.event.date_created)}</div>;
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const event = row.original.event;
			const participantsCount = row.original.participantsCount;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-8 p-0">
							<span className="sr-only">Abrir menu</span>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuLabel>Ações</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem asChild>
							<Link href={`/admin/eventos/${event.id}`} className="flex cursor-pointer items-center">
								<Eye className="mr-2 size-4" />
								Ver detalhes
							</Link>
						</DropdownMenuItem>
						<DropdownMenuItem asChild>
							<Link href={`/admin/eventos/${event.id}/editar`} className="flex cursor-pointer items-center">
								<Pencil className="mr-2 size-4" />
								Editar
							</Link>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DeleteEventDialog
							eventId={event.id}
							eventTitle={event.title || 'Evento sem título'}
							participantsCount={participantsCount}
							onSuccess={onEventDeleted}
						/>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
