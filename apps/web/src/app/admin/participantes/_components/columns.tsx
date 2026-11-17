'use client';
import { Checkbox } from '@/components/ui/checkbox';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ColumnDef } from '@tanstack/react-table';
import { Check, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import type { ParticipantRow } from '../_lib/types';
import {
	formatCurrency,
	formatDate,
	getInitials,
	paymentMethodLabels,
	paymentStatusBadgeClasses,
	paymentStatusLabels,
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
				aria-label="Selecionar todos os participantes"
			/>
		),
		cell: ({ row }) => (
			<Checkbox
				checked={row.getIsSelected()}
				onCheckedChange={(checked) => row.toggleSelected(checked === true)}
				aria-label={`Selecionar ${row.original.participant_name}`}
			/>
		),
		enableSorting: false,
		enableHiding: false,
	},
	{
		accessorKey: 'participant_name',
		header: 'Participante',
		cell: ({ row }) => {
			const participant = row.original;
			const initials = getInitials(participant.participant_name);
			const avatar = participant.user_id?.avatar;

			return (
				<div className="flex items-center gap-3">
					<Avatar className="size-10">
						{avatar && <AvatarImage src={avatar} alt={participant.participant_name} />}
						<AvatarFallback>{initials}</AvatarFallback>
					</Avatar>
					<div className="flex flex-col">
						<span className="font-medium text-foreground ">{participant.participant_name}</span>
						<span className="text-sm text-muted-foreground ">{participant.participant_email}</span>
						{participant.participant_phone && (
							<span className="text-xs text-muted-foreground ">{participant.participant_phone}</span>
						)}
					</div>
				</div>
			);
		},
	},
	{
		accessorKey: 'event_id.title',
		header: 'Evento',
		cell: ({ row }) => {
			const event = row.original.event_id;

			return (
				<div className="flex flex-col">
					<span className="font-semibold text-foreground ">{event.title}</span>
					<span className="text-sm text-muted-foreground ">{formatDate(event.start_date, 'dd MMM yyyy, HH:mm')}</span>
				</div>
			);
		},
	},
	{
		accessorKey: 'ticket_type_id.title',
		header: 'Tipo Ingresso',
		cell: ({ row }) => {
			const ticket = row.original.ticket_type_id;
			const quantity = row.original.quantity;

			if (!ticket) {
				return <span className="text-muted-foreground">—</span>;
			}

			return (
				<div className="flex flex-col">
					<span className="font-medium text-foreground ">{ticket.title}</span>
					<span className="text-sm text-muted-foreground ">Quantidade: {quantity}</span>
				</div>
			);
		},
	},
	{
		accessorKey: 'payment_status',
		header: 'Pagamento',
		cell: ({ row }) => {
			const status = row.original.payment_status;
			const total = row.original.total_amount;
			const method = row.original.payment_method;

			return (
				<div className="flex flex-col gap-1">
					<Badge className={paymentStatusBadgeClasses[status || ''] || ''}>
						{paymentStatusLabels[status || ''] || status}
					</Badge>
					<span className="text-sm text-foreground ">{formatCurrency(total)}</span>
					{method && method !== 'free' && (
						<span className="text-xs text-muted-foreground ">{paymentMethodLabels[method] || method}</span>
					)}
				</div>
			);
		},
	},
	{
		accessorKey: 'check_in_date',
		header: 'Check-in',
		cell: ({ row }) => {
			const checkInDate = row.original.check_in_date;

			if (checkInDate) {
				return (
					<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
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
						<DropdownMenuItem onClick={() => options?.onEditClick?.(participant)}>Editar</DropdownMenuItem>
						<DropdownMenuItem onClick={() => options?.onResendEmailClick?.(participant)}>
							Reenviar email
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-rose-600" onClick={() => options?.onCancelClick?.(participant)}>
							Cancelar inscrição
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			);
		},
	},
];
