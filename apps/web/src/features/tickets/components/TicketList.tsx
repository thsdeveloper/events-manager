'use client';

import { Eye, EyeOff, Infinity as InfinityIcon, Pencil, Plus, Ticket, Trash2, Users } from 'lucide-react';
import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/fees';
import { cn } from '@/lib/utils';
import { ticketKey, type TicketDraft } from '../types';

const VISIBILITY_LABEL = {
	public: 'Público',
	invited_only: 'Convidados',
	manual: 'Manual',
} as const;

interface TicketRowProps {
	ticket: TicketDraft;
	isFree: boolean;
	onEdit: (ticket: TicketDraft) => void;
	onRemove: (ticket: TicketDraft) => void;
}

const TicketRow = memo(function TicketRow({ ticket, isFree, onEdit, onRemove }: TicketRowProps) {
	// Bound here so each row keeps a stable handler and memoisation actually holds.
	const handleEdit = useCallback(() => onEdit(ticket), [onEdit, ticket]);
	const handleRemove = useCallback(() => onRemove(ticket), [onRemove, ticket]);
	const isPublic = ticket.visibility === 'public';

	return (
		<li className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4 transition-colors hover:border-primary/40">
			<div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
				<Ticket className="size-5" />
			</div>

			<div className="min-w-0 flex-1">
				<p className="truncate font-semibold text-foreground">{ticket.title}</p>
				<div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
					<span className="inline-flex items-center gap-1">
						<Users className="size-3" />
						{ticket.quantity.toLocaleString('pt-BR')} disponíveis
					</span>
					<span className="inline-flex items-center gap-1">
						{isPublic ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
						{VISIBILITY_LABEL[ticket.visibility]}
					</span>
					{ticket.allow_installments && ticket.max_installments ? (
						<span className="inline-flex items-center gap-1">
							<InfinityIcon className="size-3" />
							até {ticket.max_installments}x
						</span>
					) : null}
				</div>
			</div>

			<div className="text-right">
				<p className={cn('font-bold tabular-nums', isFree ? 'text-emerald-600' : 'text-foreground')}>
					{isFree || ticket.price === 0 ? 'Gratuito' : formatCurrency(Number(ticket.price))}
				</p>
				{!isFree && ticket.price > 0 && (
					<p className="text-[11px] text-muted-foreground">
						{ticket.service_fee_type === 'passed_to_buyer' ? 'comprador paga a taxa' : 'taxa absorvida'}
					</p>
				)}
			</div>

			<div className="flex items-center gap-1">
				<Button type="button" variant="ghost" size="icon" onClick={handleEdit} aria-label={`Editar ${ticket.title}`}>
					<Pencil className="size-4" />
				</Button>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					onClick={handleRemove}
					aria-label={`Remover ${ticket.title}`}
					className="text-destructive hover:bg-destructive/10 hover:text-destructive"
				>
					<Trash2 className="size-4" />
				</Button>
			</div>
		</li>
	);
});

interface TicketListProps {
	tickets: TicketDraft[];
	isFree: boolean;
	onAdd: () => void;
	onEdit: (ticket: TicketDraft) => void;
	onRemove: (ticket: TicketDraft) => void;
	emptyHint?: string;
}

export function TicketList({ tickets, isFree, onAdd, onEdit, onRemove, emptyHint }: TicketListProps) {
	if (tickets.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 px-6 py-10 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
					<Ticket className="size-6" />
				</div>
				<div>
					<p className="font-medium text-foreground">Nenhum ingresso cadastrado</p>
					<p className="mt-1 max-w-sm text-sm text-muted-foreground">
						{emptyHint ?? 'Cadastre pelo menos um tipo de ingresso para o público conseguir se inscrever.'}
					</p>
				</div>
				<Button type="button" onClick={onAdd}>
					<Plus className="mr-2 size-4" />
					Adicionar ingresso
				</Button>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<ul className="space-y-2">
				{tickets.map(ticket => (
					<TicketRow key={ticketKey(ticket)} ticket={ticket} isFree={isFree} onEdit={onEdit} onRemove={onRemove} />
				))}
			</ul>
			<Button type="button" variant="outline" onClick={onAdd} className="w-full border-dashed">
				<Plus className="mr-2 size-4" />
				Adicionar outro ingresso
			</Button>
		</div>
	);
}
