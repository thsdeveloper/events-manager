'use client';

import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
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
  formatDate,
  formatCurrency,
  getInitials,
  statusLabels,
  statusBadgeClasses,
  paymentStatusLabels,
  paymentStatusBadgeClasses,
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
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        onChange={(e) => table.toggleAllPageRowsSelected(!!e.target.checked)}
        className="rounded border-gray-300"
        aria-label="Selecionar todos os participantes"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(!!e.target.checked)}
        className="rounded border-gray-300"
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
            <span className="font-medium text-gray-900 dark:text-white">
              {participant.participant_name}
            </span>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {participant.participant_email}
            </span>
            {participant.participant_phone && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {participant.participant_phone}
              </span>
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
          <span className="font-semibold text-gray-900 dark:text-white">{event.title}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {formatDate(event.start_date, 'dd MMM yyyy, HH:mm')}
          </span>
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
        return <span className="text-gray-500">—</span>;
      }

      return (
        <div className="flex flex-col">
          <span className="font-medium text-gray-900 dark:text-white">{ticket.title}</span>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Quantidade: {quantity}
          </span>
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
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {formatCurrency(total)}
          </span>
          {method && method !== 'free' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {paymentMethodLabels[method] || method}
            </span>
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
        <Button
          size="sm"
          variant="outline"
          onClick={() => options?.onCheckInClick?.(row.original)}
        >
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
              Editar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => options?.onResendEmailClick?.(participant)}>
              Reenviar email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose-600"
              onClick={() => options?.onCancelClick?.(participant)}
            >
              Cancelar inscrição
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
