'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Check, MoreHorizontal, Calendar, CreditCard, Ticket } from 'lucide-react';
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
  statusBadgeClasses,
  paymentStatusLabels,
  paymentStatusBadgeClasses,
} from '../_lib/utils';

interface ParticipantCardProps {
  participant: ParticipantRow;
  onCheckInClick: (participant: ParticipantRow) => void;
}

export function ParticipantCard({ participant, onCheckInClick }: ParticipantCardProps) {
  const initials = getInitials(participant.participant_name);
  const avatar = participant.user_id?.avatar;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
      {/* Header com Avatar e Nome */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="size-12">
            {avatar && <AvatarImage src={avatar} alt={participant.participant_name} />}
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Link
              href={`/admin/participantes/${participant.id}`}
              className="font-semibold text-gray-900 hover:text-blue-600 dark:text-white dark:hover:text-blue-400"
            >
              {participant.participant_name}
            </Link>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {participant.participant_email}
            </p>
          </div>
        </div>

        {/* Menu de Ações */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="size-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/participantes/${participant.id}`}>Ver detalhes</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCheckInClick(participant)}>
              {participant.check_in_date ? 'Desfazer check-in' : 'Fazer check-in'}
            </DropdownMenuItem>
            <DropdownMenuItem>Editar</DropdownMenuItem>
            <DropdownMenuItem>Reenviar email</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-rose-600">Cancelar inscrição</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Informações Principais */}
      <div className="mt-4 space-y-3">
        {/* Evento */}
        <div className="flex items-start gap-2">
          <Calendar className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              {participant.event_id.title}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {formatDate(participant.event_id.start_date, 'dd MMM yyyy, HH:mm')}
            </p>
          </div>
        </div>

        {/* Ingresso */}
        {participant.ticket_type_id && (
          <div className="flex items-start gap-2">
            <Ticket className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <div className="flex-1">
              <p className="text-sm text-gray-900 dark:text-white">
                {participant.ticket_type_id.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Quantidade: {participant.quantity}
              </p>
            </div>
          </div>
        )}

        {/* Pagamento */}
        <div className="flex items-start gap-2">
          <CreditCard className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <div className="flex flex-1 items-center justify-between">
            <div>
              <Badge className={`${paymentStatusBadgeClasses[participant.payment_status || '']} text-xs`}>
                {paymentStatusLabels[participant.payment_status || ''] || participant.payment_status}
              </Badge>
              <p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
                {formatCurrency(participant.total_amount)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer com Check-in */}
      <div className="mt-4 border-t border-gray-200 pt-3 dark:border-gray-700">
        {participant.check_in_date ? (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Check className="size-4" />
              <span className="text-sm font-medium">Check-in realizado</span>
            </div>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              {formatDate(participant.check_in_date, 'dd MMM yyyy')}
            </span>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCheckInClick(participant)}
            className="w-full"
          >
            Fazer Check-in
          </Button>
        )}
      </div>
    </div>
  );
}
