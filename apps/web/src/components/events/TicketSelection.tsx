'use client';

import { useMemo, useState } from 'react';
import { Flame, Minus, Plus, Ticket } from 'lucide-react';
import type { EventTicket } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/formatters';
import { cn } from '@/lib/utils';

export interface TicketSelectionItem {
	ticketId: string;
	quantity: number;
}

interface TicketSelectionProps {
	groups?: Array<{ id: string; title: string; parent_id?: string | null }>;
	eventId: string;
	tickets: EventTicket[];
	/** Mantém o carrinho do checkout ao voltar entre etapas. */
	selection?: TicketSelectionItem[];
	onCheckout: (selectedTickets: TicketSelectionItem[]) => void;
	/** Avisa a cada mudança, para o resumo da compra acompanhar ao lado. */
	onSelectionChange?: (selectedTickets: TicketSelectionItem[]) => void;
	/** O resumo da compra assume o botão de avançar. */
	hideAction?: boolean;
	isLoading?: boolean;
}

/** Abaixo disso a disponibilidade vira um aviso de escassez. */
const SCARCITY_THRESHOLD = 10;

const toNumber = (value: number | string | null | undefined): number => {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string') {
		const parsed = parseFloat(value);

		return Number.isFinite(parsed) ? parsed : 0;
	}

	return 0;
};

/**
 * Regras de quantidade de um ingresso, resolvidas uma vez por cartão: quanto
 * ainda há em estoque, o mínimo e o máximo por compra e de onde vem o teto.
 */
function describeLimits(ticket: EventTicket) {
	const available = Math.max((ticket.quantity ?? 0) - (ticket.quantity_sold ?? 0), 0);
	const maxPerPurchase = ticket.max_quantity_per_purchase || null;
	const minPerPurchase = Math.max(ticket.min_quantity_per_purchase ?? 1, 1);
	const maxAllowed = Math.min(available, maxPerPurchase ?? available);
	const limitedByPurchase = maxPerPurchase !== null && maxPerPurchase <= available;

	return { available, limitedByPurchase, maxAllowed, maxPerPurchase, minPerPurchase };
}

function isAvailable(ticket: EventTicket, now: Date) {
	return (
		ticket.status === 'active' &&
		(!ticket.visibility || ticket.visibility === 'public') &&
		describeLimits(ticket).available > 0 &&
		(!ticket.sale_start_date || new Date(ticket.sale_start_date) <= now) &&
		(!ticket.sale_end_date || new Date(ticket.sale_end_date) >= now)
	);
}

export function getInitialTicketSelection(tickets: EventTicket[]): TicketSelectionItem[] {
	const now = new Date();
	const ticket = tickets.find((candidate) => {
		const { maxAllowed, minPerPurchase } = describeLimits(candidate);

		return isAvailable(candidate, now) && maxAllowed >= minPerPurchase;
	});

	return ticket ? [{ ticketId: ticket.id, quantity: describeLimits(ticket).minPerPurchase }] : [];
}

export default function TicketSelection({
	eventId: _eventId,
	tickets,
	selection,
	groups = [],
	onCheckout,
	onSelectionChange,
	hideAction = false,
	isLoading = false,
}: TicketSelectionProps) {
	const [localSelection, setSelectedTickets] = useState<Map<string, number>>(() => new Map());
	const selectedTickets = useMemo(
		() => (selection ? new Map(selection.map(({ ticketId, quantity }) => [ticketId, quantity])) : localSelection),
		[selection, localSelection],
	);

	const toItems = (selection: Map<string, number>): TicketSelectionItem[] =>
		Array.from(selection.entries()).map(([ticketId, quantity]) => ({ ticketId, quantity }));

	const availableTickets = useMemo(() => {
		const now = new Date();

		return tickets.filter((ticket) => isAvailable(ticket, now));
	}, [tickets]);

	const totals = useMemo(() => {
		let subtotal = 0;
		let convenienceFee = 0;
		let total = 0;
		let totalTickets = 0;

		selectedTickets.forEach((quantity, ticketId) => {
			const ticket = tickets.find((t) => t.id === ticketId);
			if (!ticket || quantity <= 0) return;

			totalTickets += quantity;
			const ticketPrice = toNumber(ticket.price);
			subtotal += ticketPrice * quantity;

			if ((ticket.service_fee_type ?? 'passed_to_buyer') === 'passed_to_buyer') {
				const buyerPrice = toNumber(ticket.buyer_price || ticket.price);
				convenienceFee += (buyerPrice - ticketPrice) * quantity;
				total += buyerPrice * quantity;
			} else {
				total += ticketPrice * quantity;
			}
		});

		return { subtotal, serviceFee: convenienceFee, total, totalTickets };
	}, [selectedTickets, tickets]);

	const commit = (ticketId: string, quantity: number) => {
		const next = new Map(selectedTickets);
		if (quantity <= 0) next.delete(ticketId);
		else next.set(ticketId, quantity);
		if (!selection) setSelectedTickets(next);
		onSelectionChange?.(toItems(next));
	};

	// O passo respeita o mínimo por compra: do zero vai direto ao mínimo, e
	// descer abaixo dele esvazia a linha em vez de deixar uma quantidade inválida.
	const handleStep = (ticket: EventTicket, delta: number) => {
		const { maxAllowed, minPerPurchase } = describeLimits(ticket);
		const current = selectedTickets.get(ticket.id) ?? 0;
		let next = current + delta;
		if (delta > 0 && current === 0) next = minPerPurchase;
		if (delta < 0 && next < minPerPurchase) next = 0;
		next = Math.max(0, Math.min(next, maxAllowed));
		if (next === current) return;
		commit(ticket.id, next);
	};

	const handleDirectInput = (ticket: EventTicket, value: string) => {
		const { maxAllowed } = describeLimits(ticket);
		const quantity = parseInt(value, 10) || 0;
		commit(ticket.id, Math.max(0, Math.min(quantity, maxAllowed)));
	};

	const handleBlur = (ticket: EventTicket) => {
		const { maxAllowed, minPerPurchase } = describeLimits(ticket);
		const current = selectedTickets.get(ticket.id) ?? 0;
		if (current > 0 && current < minPerPurchase) commit(ticket.id, Math.min(minPerPurchase, maxAllowed));
	};

	const hasSelection = selectedTickets.size > 0;

	return (
		<div className="space-y-6">
			<div className="space-y-4">
				{availableTickets.length === 0 ? (
					<Card>
						<CardContent className="py-8 text-center">
							<p className="text-muted-foreground">Nenhum ingresso disponível no momento.</p>
						</CardContent>
					</Card>
				) : (
					availableTickets.map((ticket) => {
						const { available, limitedByPurchase, maxAllowed, maxPerPurchase, minPerPurchase } = describeLimits(ticket);
						const selected = selectedTickets.get(ticket.id) ?? 0;
						const isAbsorbed = (ticket.service_fee_type ?? 'passed_to_buyer') === 'absorbed';
						const basePrice = toNumber(ticket.price);
						const buyerPrice = isAbsorbed ? basePrice : toNumber(ticket.buyer_price || ticket.price);
						const fee = buyerPrice - basePrice;
						const isScarce = available <= SCARCITY_THRESHOLD;
						const atLimit = selected > 0 && selected >= maxAllowed;

						return (
							<Card
								key={ticket.id}
								data-selected={selected > 0 || undefined}
								className={cn(
									'transition-[border-color,box-shadow] duration-200',
									selected > 0 ? 'border-primary shadow-md ring-1 ring-primary/40' : 'hover:border-foreground/20',
								)}
							>
								<CardContent className="space-y-5 p-5 sm:p-6">
									<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
										<div className="min-w-0 flex-1 space-y-1">
											<h3 className="text-lg font-semibold leading-tight text-foreground">{ticket.title}</h3>
											{ticket.admission_type === 'half_price' && <p className="text-sm font-medium">Meia-entrada</p>}
											{ticket.group_id && (
												<p className="text-xs text-muted-foreground">
													{
														groups.find(
															(group) =>
																group.id === groups.find((candidate) => candidate.id === ticket.group_id)?.parent_id,
														)?.title
													}
													{groups.find((group) => group.id === ticket.group_id)?.parent_id ? ' › ' : ''}
													{groups.find((group) => group.id === ticket.group_id)?.title}
												</p>
											)}
											{ticket.description ? (
												<p className="text-sm text-muted-foreground">{ticket.description}</p>
											) : null}
											<div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-2 text-xs">
												{isScarce ? (
													<span className="inline-flex items-center gap-1 font-semibold text-warning">
														<Flame className="size-3.5" aria-hidden="true" />
														{available === 1 ? 'Resta apenas 1 ingresso' : `Restam apenas ${available} ingressos`}
													</span>
												) : (
													<span className="inline-flex items-center gap-1 text-muted-foreground">
														<Ticket className="size-3.5" aria-hidden="true" />
														{`${available} disponíveis`}
													</span>
												)}
												{minPerPurchase > 1 ? (
													<span className="text-muted-foreground">{`Mínimo de ${minPerPurchase} por compra`}</span>
												) : null}
												{maxPerPurchase ? (
													<span className="text-muted-foreground">{`Até ${maxPerPurchase} por compra`}</span>
												) : null}
											</div>
										</div>

										<div className="shrink-0 sm:text-right">
											<p className="text-2xl font-bold tabular-nums leading-none text-foreground">
												{formatCurrency(buyerPrice)}
											</p>
											<p className="mt-1.5 text-xs text-muted-foreground">
												{isAbsorbed
													? 'Sem taxa adicional'
													: `${formatCurrency(basePrice)} + ${formatCurrency(fee)} de taxa de serviço`}
											</p>
										</div>
									</div>

									<div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
										<div className="min-h-5 space-y-1 text-sm">
											{selected > 0 ? (
												<p className="font-semibold tabular-nums text-foreground">
													{`Subtotal ${formatCurrency(buyerPrice * selected)}`}
												</p>
											) : (
												<p className="text-muted-foreground">Escolha a quantidade</p>
											)}
											{atLimit ? (
												<p className="text-xs text-warning" role="status">
													{limitedByPurchase && maxPerPurchase
														? `Você chegou ao limite de ${maxPerPurchase} por compra`
														: 'Não há mais ingressos disponíveis'}
												</p>
											) : null}
										</div>

										<div
											role="group"
											aria-label={`Ingressos ${ticket.title}`}
											className={cn(
												'inline-flex h-11 items-center self-end overflow-hidden rounded-lg border bg-background shadow-sm sm:self-auto',
												selected > 0 ? 'border-primary' : 'border-input',
											)}
										>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-full w-11 rounded-none"
												onClick={() => handleStep(ticket, -1)}
												disabled={selected === 0 || isLoading}
												aria-label={`Remover um ingresso ${ticket.title}`}
											>
												<Minus className="size-4" aria-hidden="true" />
											</Button>
											<input
												type="number"
												inputMode="numeric"
												min={0}
												max={maxAllowed}
												value={selected}
												onChange={(event) => handleDirectInput(ticket, event.target.value)}
												onBlur={() => handleBlur(ticket)}
												aria-label={`Quantidade de ${ticket.title}`}
												disabled={isLoading}
												className="h-full w-14 border-x border-input bg-transparent text-center text-base font-semibold tabular-nums text-foreground outline-none focus-visible:bg-accent/40 disabled:opacity-50 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="h-full w-11 rounded-none"
												onClick={() => handleStep(ticket, 1)}
												disabled={selected >= maxAllowed || isLoading}
												aria-label={`Adicionar um ingresso ${ticket.title}`}
											>
												<Plus className="size-4" aria-hidden="true" />
											</Button>
										</div>
									</div>
								</CardContent>
							</Card>
						);
					})
				)}
			</div>

			{hasSelection && !hideAction ? (
				<Card className="sticky bottom-4 shadow-lg">
					<CardHeader>
						<CardTitle>Resumo da Compra</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="space-y-3">
							<div className="flex justify-between text-sm">
								<span className="text-muted-foreground">{`Ingressos (${totals.totalTickets})`}</span>
								<span className="font-medium tabular-nums">{formatCurrency(totals.subtotal)}</span>
							</div>
							{totals.serviceFee > 0 ? (
								<div className="flex justify-between text-sm">
									<span className="text-muted-foreground">Taxa de serviço</span>
									<span className="font-medium tabular-nums">{formatCurrency(totals.serviceFee)}</span>
								</div>
							) : null}
							<div className="flex justify-between border-t-2 pt-3 text-xl font-bold">
								<span>Total</span>
								<span className="tabular-nums text-primary">{formatCurrency(totals.total)}</span>
							</div>
						</div>

						<Button
							className="w-full"
							size="lg"
							onClick={() => onCheckout(toItems(selectedTickets))}
							disabled={!hasSelection || isLoading}
						>
							{isLoading ? 'Processando...' : 'Finalizar Compra'}
						</Button>

						<p className="text-center text-xs text-muted-foreground">Pagamento seguro via AbacatePay</p>
					</CardContent>
				</Card>
			) : null}
		</div>
	);
}
