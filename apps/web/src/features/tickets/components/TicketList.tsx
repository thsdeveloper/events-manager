'use client';
import { Empty } from '@/components/ui/empty';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/fees';
import { ticketKey, type TicketDraft } from '../types';
export interface TicketGroupOption {
	id: string;
	title: string;
	parent_id?: string | null;
}
interface TicketListProps {
	tickets: TicketDraft[];
	isFree: boolean;
	onAdd: () => void;
	onEdit: (ticket: TicketDraft) => void;
	onRemove: (ticket: TicketDraft) => void;
	emptyHint?: string;
	onReorder?: (tickets: TicketDraft[]) => void;
	onDuplicate?: (ticket: TicketDraft) => void;
	groups?: TicketGroupOption[];
}
export function TicketList({
	tickets,
	isFree,
	onAdd,
	onEdit,
	onRemove,
	emptyHint,
	onReorder,
	onDuplicate,
	groups = [],
}: TicketListProps) {
	const move = (index: number, direction: -1 | 1) => {
		const next = [...tickets];
		[next[index], next[index + direction]] = [next[index + direction], next[index]];
		onReorder?.(next);
	};

	return (
		<div className="space-y-3">
			{tickets.length === 0 ? (
				<Empty className="rounded-lg border border-dashed p-6 text-center">
					<p className="font-medium">Nenhum ingresso cadastrado</p>
					<p className="text-sm text-muted-foreground">
						{emptyHint ?? 'Cadastre pelo menos um tipo de ingresso para o público conseguir se inscrever.'}
					</p>
				</Empty>
			) : (
				<ul className="space-y-2">
					{tickets.map((ticket, index) => (
						<li key={ticketKey(ticket)}>
							<Card className="flex flex-wrap items-center gap-3 p-4">
								<div className="min-w-0 flex-1">
									<p className="font-semibold">{ticket.title}</p>
									<p className="text-xs text-muted-foreground">
										{ticket.quantity.toLocaleString('pt-BR')} disponíveis ·{' '}
										{ticket.visibility === 'public'
											? 'Público'
											: ticket.visibility === 'manual'
												? 'Manual — emissão indisponível'
												: 'Convidados — venda indisponível'}
									</p>
									<p className="text-xs text-muted-foreground">
										{ticket.admission_type === 'half_price' ? 'Meia-entrada · ' : ''}
										{groups.find((group) => group.id === ticket.group_id)?.title}
									</p>
								</div>
								<div className="text-right">
									<p className="font-bold">
										{isFree || ticket.price === 0 ? 'Gratuito' : formatCurrency(Number(ticket.price))}
									</p>
									{!isFree && ticket.price > 0 && (
										<p className="text-xs text-muted-foreground">
											{ticket.service_fee_type === 'passed_to_buyer' ? 'comprador paga a taxa' : 'taxa absorvida'}
										</p>
									)}
								</div>
								<div className="flex flex-wrap gap-1">
									{onReorder && (
										<>
											<Button
												type="button"
												variant="ghost"
												disabled={index === 0}
												aria-label={'Mover ' + ticket.title + ' para cima'}
												onClick={() => move(index, -1)}
											>
												↑
											</Button>
											<Button
												type="button"
												variant="ghost"
												disabled={index === tickets.length - 1}
												aria-label={'Mover ' + ticket.title + ' para baixo'}
												onClick={() => move(index, 1)}
											>
												↓
											</Button>
										</>
									)}
									<Button
										type="button"
										variant="ghost"
										aria-label={'Editar ' + ticket.title}
										onClick={() => onEdit(ticket)}
									>
										Editar
									</Button>
									{onDuplicate && (
										<Button
											type="button"
											variant="ghost"
											aria-label={'Duplicar ' + ticket.title}
											onClick={() => onDuplicate(ticket)}
										>
											Duplicar
										</Button>
									)}
									<Button
										type="button"
										variant="ghost"
										aria-label={'Remover ' + ticket.title}
										onClick={() => onRemove(ticket)}
									>
										Remover
									</Button>
								</div>
							</Card>
						</li>
					))}
				</ul>
			)}
			<Button type="button" variant={tickets.length ? 'outline' : 'default'} onClick={onAdd}>
				{tickets.length ? 'Adicionar outro ingresso' : 'Adicionar ingresso'}
			</Button>
		</div>
	);
}
