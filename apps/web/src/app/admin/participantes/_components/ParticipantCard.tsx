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
	getParticipantFullName,
	paymentStatusLabels,
	paymentStatusBadgeClasses,
} from '../_lib/utils';

interface ParticipantCardProps {
	participant: ParticipantRow;
	onCheckInClick: (participant: ParticipantRow) => void;
	onEditClick?: (participant: ParticipantRow) => void;
	onResendEmailClick?: (participant: ParticipantRow) => void;
	onCancelClick?: (participant: ParticipantRow) => void;
}

/** Versão em cartão de uma linha da tabela, para telas estreitas. */
export function ParticipantCard({
	participant,
	onCheckInClick,
	onEditClick,
	onResendEmailClick,
	onCancelClick,
}: ParticipantCardProps) {
	const name = getParticipantFullName(participant);
	const avatar = participant.is_buyer ? participant.registration.user?.avatar : null;
	const payment = participant.registration.payment_status;

	return (
		<div className="rounded-lg border border-gray-200 bg-white p-4 transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					<Avatar className="size-12">
						{avatar && <AvatarImage src={avatar} alt={name} />}
						<AvatarFallback>{participant.attendee_name ? getInitials(participant.attendee_name) : '?'}</AvatarFallback>
					</Avatar>
					<div className="flex-1">
						<Link
							href={`/admin/participantes/${participant.id}`}
							className={`font-semibold hover:text-blue-600 dark:hover:text-blue-400 ${
								participant.attendee_name
									? 'text-gray-900 dark:text-white'
									: 'italic text-amber-700 dark:text-amber-300'
							}`}
						>
							{name}
						</Link>
						{participant.attendee_email && (
							<p className="text-sm text-gray-600 dark:text-gray-400">{participant.attendee_email}</p>
						)}
						{!participant.is_buyer && (
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Comprado por {participant.registration.participant_name}
							</p>
						)}
					</div>
				</div>

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
						<DropdownMenuItem onClick={() => onEditClick?.(participant)}>
							{participant.attendee_name ? 'Editar participante' : 'Informar participante'}
						</DropdownMenuItem>
						<DropdownMenuItem onClick={() => onResendEmailClick?.(participant)}>Reenviar email</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem className="text-rose-600" onClick={() => onCancelClick?.(participant)}>
							Cancelar pedido
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			<div className="mt-4 space-y-3">
				<div className="flex items-start gap-2">
					<Calendar className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400" />
					<div className="flex-1">
						<p className="text-sm font-medium text-gray-900 dark:text-white">{participant.event.title}</p>
						<p className="text-xs text-gray-600 dark:text-gray-400">
							{formatDate(participant.event.start_date, 'dd MMM yyyy, HH:mm')}
						</p>
					</div>
				</div>

				<div className="flex items-start gap-2">
					<Ticket className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400" />
					<div className="flex-1">
						<p className="text-sm text-gray-900 dark:text-white">{participant.ticket_type?.title ?? 'Ingresso'}</p>
						<p className="text-xs text-gray-600 dark:text-gray-400">
							Ingresso {participant.sequence} de {participant.registration.quantity} ·{' '}
							<span className="font-mono">{participant.ticket_code}</span>
						</p>
					</div>
				</div>

				<div className="flex items-start gap-2">
					<CreditCard className="mt-0.5 size-4 shrink-0 text-gray-500 dark:text-gray-400" />
					<div className="flex flex-1 items-center justify-between">
						<div>
							<Badge className={`${paymentStatusBadgeClasses[payment || '']} text-xs`}>
								{paymentStatusLabels[payment || ''] || payment}
							</Badge>
							<p className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">
								{formatCurrency(participant.total_amount)}
							</p>
						</div>
					</div>
				</div>
			</div>

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
					<Button size="sm" variant="outline" onClick={() => onCheckInClick(participant)} className="w-full">
						Fazer Check-in
					</Button>
				)}
			</div>
		</div>
	);
}
