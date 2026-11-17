'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Check } from 'lucide-react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ParticipantRow } from '../_lib/types';
import {
	deriveTicketStatus,
	formatDate,
	formatCurrency,
	getInitials,
	getParticipantFullName,
	statusLabels,
	paymentStatusLabels,
	paymentMethodLabels,
} from '../_lib/utils';

interface ColumnsOptions {
	onCheckInClick?: (participant: ParticipantRow) => void;
	onEditClick?: (participant: ParticipantRow) => void;
	onResendEmailClick?: (participant: ParticipantRow) => void;
	onCancelClick?: (participant: ParticipantRow) => void;
}

export const createColumns = (options?: ColumnsOptions): ColumnDef<ParticipantRow>[] => [
	{
		id: 'select',
		header: ({ table }) => (
			<Checkbox
				checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')}
				onCheckedChange={(checked) => table.toggleAllPageRowsSelected(checked === true)}
				aria-label="Selecionar todos os ingressos"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(checked) => row.toggleSelected(checked === true)}
				aria-label={`Selecionar ${getParticipantFullName(row.original)}`}
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: 'attendee_name',
		header: 'Participante',
		cell: ({ row }) => {
			const ticket = row.original;
			const name = getParticipantFullName(ticket);
			// O avatar é da conta de quem comprou; só vale quando o ingresso é dela.
			const avatar = ticket.is_buyer ? ticket.registration.user?.avatar : null;

			return (
				<div className="flex items-center gap-3">
					<Avatar className="size-10">
						{avatar && <AvatarImage src={avatar} alt={name} />}
						<AvatarFallback>{ticket.attendee_name ? getInitials(ticket.attendee_name) : '?'}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						{ticket.attendee_name ? (
							<span className="font-medium text-foreground">{ticket.attendee_name}</span>
						) : (
							<span className="font-medium italic text-muted-foreground ">{name}</span>
						)}
						{ticket.attendee_email && (
							<span className="text-sm text-muted-foreground dark:text-muted-foreground">{ticket.attendee_email}</span>
						)}
						{ticket.attendee_phone && (
							<span className="text-xs text-muted-foreground dark:text-muted-foreground">{ticket.attendee_phone}</span>
						)}
						{!ticket.is_buyer && (
							<span className="text-xs text-muted-foreground dark:text-muted-foreground">
								Comprado por {ticket.registration.participant_name}
							</span>
						)}
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: 'event.title',
		header: 'Evento',
		cell: ({ row }) => {
			const event = row.original.event;

			return (
				<div className="flex flex-col">
					<span className="font-semibold text-foreground">{event.title}</span>
					<span className="text-sm text-muted-foreground dark:text-muted-foreground">
						{formatDate(event.start_date, 'dd MMM yyyy, HH:mm')}
					</span>
				</div>
			);
		},
	},
	{
		accessorKey: 'ticket_type.title',
		header: 'Tipo Ingresso',
		cell: ({ row }) => {
			const ticket = row.original;

			return (
				<div className="flex flex-col">
					<span className="font-medium text-foreground">{ticket.ticket_type?.title ?? 'Ingresso'}</span>
					<span className="text-sm text-muted-foreground dark:text-muted-foreground">
						Ingresso {ticket.sequence} de {ticket.registration.quantity}
					</span>
					<span className="font-mono text-xs text-muted-foreground dark:text-muted-foreground">
						{ticket.ticket_code}
					</span>
				</div>
			);
		},
	},
	{
		accessorKey: 'registration.payment_status',
		header: 'Pagamento',
		cell: ({ row }) => {
			const ticket = row.original;
			const status = ticket.registration.payment_status;
			const method = ticket.registration.payment_method;

			return (
				<div className="flex flex-col gap-1">
					<Badge variant="secondary">{paymentStatusLabels[status || ''] || status}</Badge>
					<span className="text-sm text-foreground">{formatCurrency(ticket.total_amount)}</span>
					{method && method !== 'free' && (
						<span className="text-xs text-muted-foreground dark:text-muted-foreground">
							{paymentMethodLabels[method] || method}
						</span>
					)}
				</div>
			);
		},
	},
	{
		id: 'status',
		header: 'Status',
		cell: ({ row }) => {
			const status = deriveTicketStatus(row.original);

			return <Badge variant="secondary">{statusLabels[status] || status}</Badge>;
		},
	},
	{
		accessorKey: 'check_in_date',
		header: 'Check-in',
		cell: ({ row }) => {
			const checkInDate = row.original.check_in_date;

			if (checkInDate) {
				return (
					<div className="flex items-center gap-2 text-muted-foreground ">
						<Check className="size-4" />
						<span className="text-sm font-medium">{formatDate(checkInDate)}</span>
					</div>
				);
			}

			return (
				<Button size="sm" variant="outline" onClick={() => options?.onCheckInClick?.(row.original)}>
					Fazer Check-in
				</Button>
			);
		},
	},
	{
		id: 'actions',
		cell: ({ row }) => {
			const participant = row.original;

			return (
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" className="size-8 p-0">
							<span className="sr-only">Abrir menu</span>
							<MoreHorizontal className="size-4" />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem asChild>
							<Link href={`/admin/participantes/${participant.id}`}>Ver detalhes</Link>
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => options?.onCheckInClick?.(participant)}>
							{participant.check_in_date ? 'Desfazer check-in' : 'Fazer check-in'}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => options?.onEditClick?.(participant)}>
							{participant.attendee_name ? 'Editar participante' : 'Informar participante'}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => options?.onResendEmailClick?.(participant)}>
							Reenviar email
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-destructive" onClick={() => options?.onCancelClick?.(participant)}>
							Cancelar pedido
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
