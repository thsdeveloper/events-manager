'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, Check, CreditCard, MoreHorizontal, Ticket } from 'lucide-react';
import Link from 'next/link';
import type { ParticipantRow } from '../_lib/types';
import { formatCurrency, formatDate, getInitials, paymentStatusBadgeClasses, paymentStatusLabels } from '../_lib/utils';

interface ParticipantCardProps {
	participant: ParticipantRow;
	onCheckInClick: (participant: ParticipantRow) => void;
}

export function ParticipantCard({ participant, onCheckInClick }: ParticipantCardProps) {
	const initials = getInitials(participant.participant_name);
	const avatar = participant.user_id?.avatar;

	return (
		<Card className="rounded-lg border border-border bg-card p-4 transition-all hover:shadow-md  ">
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
							className="font-semibold text-foreground hover:text-blue-600  dark:hover:text-blue-400"
						>
							{participant.participant_name}
						</Link>
						<p className="text-sm text-muted-foreground ">{participant.participant_email}</p>
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
					<Calendar className="mt-0.5 size-4 shrink-0 text-muted-foreground " />
					<div className="flex-1">
						<p className="text-sm font-medium text-foreground ">{participant.event_id.title}</p>
						<p className="text-xs text-muted-foreground ">
							{formatDate(participant.event_id.start_date, 'dd MMM yyyy, HH:mm')}
						</p>
					</div>
				</div>

				{/* Ingresso */}
				{participant.ticket_type_id && (
					<div className="flex items-start gap-2">
						<Ticket className="mt-0.5 size-4 shrink-0 text-muted-foreground " />
						<div className="flex-1">
							<p className="text-sm text-foreground ">{participant.ticket_type_id.title}</p>
							<p className="text-xs text-muted-foreground ">Quantidade: {participant.quantity}</p>
						</div>
					</div>
				)}

				{/* Pagamento */}
				<div className="flex items-start gap-2">
					<CreditCard className="mt-0.5 size-4 shrink-0 text-muted-foreground " />
					<div className="flex flex-1 items-center justify-between">
						<div>
							<Badge className={`${paymentStatusBadgeClasses[participant.payment_status || '']} text-xs`}>
								{paymentStatusLabels[participant.payment_status || ''] || participant.payment_status}
							</Badge>
							<p className="mt-1 text-sm font-semibold text-foreground ">{formatCurrency(participant.total_amount)}</p>
						</div>
					</div>
				</div>
			</div>

			{/* Footer com Check-in */}
			<div className="mt-4 border-t border-border pt-3 ">
				{participant.check_in_date ? (
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
							<Check className="size-4" />
							<span className="text-sm font-medium">Check-in realizado</span>
						</div>
						<span className="text-xs text-muted-foreground ">
							{formatDate(participant.check_in_date, 'dd MMM yyyy')}
						</span>
					</div>
				) : (
					<Button size="sm" variant="outline" onClick={() => onCheckInClick(participant)} className="w-full">
						Fazer Check-in
					</Button>
				)}
			</div>
		</Card>
	);
}
