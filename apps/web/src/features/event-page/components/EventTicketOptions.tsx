import type { Event } from '@events-manager/contracts';
import { ArrowRight, Ticket } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { eventDateTime, eventPurchase, ticketSaleLabel } from '../public-event';
import { EventSection } from './EventInformation';

export function EventTicketOptions({ event, now }: { event: Event; now: number }) {
	const purchase = eventPurchase(event, now);

	return (
		<EventSection id="ingressos" title="Encontre o seu ingresso">
			<p className="-mt-2 mb-6 text-sm leading-relaxed text-muted-foreground">
				Confira as opções. A escolha do ingresso, quantidade e pagamento acontece no checkout.
			</p>
			<ul className="space-y-3">
				{purchase.tickets.map((ticket) => {
					const label = ticketSaleLabel(ticket, now);
					const available = label === 'Disponível' && !purchase.closed;
					const group = event.ticket_groups?.find((item) => item.id === ticket.group_id);
					const parent = event.ticket_groups?.find((item) => item.id === group?.parent_id);

					return (
						<li
							key={ticket.id}
							className="relative overflow-hidden rounded-2xl border border-[#743DF5]/15 bg-[#F3EEFF]/35 p-4 dark:bg-muted/30 sm:p-5"
						>
							<div className="flex items-start justify-between gap-3">
								<div className="min-w-0">
									<p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#743DF5]">
										{group ? [parent?.title, group.title].filter(Boolean).join(' / ') : 'Ingresso digital'}
									</p>
									<h3 className="font-bold">{ticket.title}</h3>
									{ticket.admission_type === 'half_price' && (
										<p className="mt-1 text-xs text-muted-foreground">
											Meia-entrada · apresente o comprovante na entrada.
										</p>
									)}
								</div>
								<Ticket className="size-5 shrink-0 text-[#743DF5]" aria-hidden />
							</div>
							{ticket.description && (
								<p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
									{ticket.description}
								</p>
							)}
							<div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-dashed border-[#743DF5]/20 pt-4">
								<div>
									<p className="text-xl font-bold">
										{Number(ticket.buyer_price ?? ticket.price) === 0
											? 'Grátis'
											: formatCurrency(Number(ticket.buyer_price ?? ticket.price))}
									</p>
									<p className="mt-0.5 text-[11px] text-muted-foreground">Taxa de serviço incluída</p>
								</div>
								<span
									className={`rounded-full px-3 py-1 text-xs font-semibold ${available ? 'bg-[#E7F8EE] text-[#166D3D]' : 'bg-muted text-muted-foreground'}`}
								>
									{purchase.closed && label === 'Disponível' ? purchase.closed : label}
								</span>
							</div>
							<details className="mt-4 text-xs text-muted-foreground">
								<summary className="w-fit cursor-pointer py-2 font-semibold text-[#743DF5]">
									Condições deste ingresso
								</summary>
								<ul className="mt-1 space-y-2 leading-relaxed">
									<li>
										Mínimo de {ticket.min_quantity_per_purchase ?? 1} ingresso(s) por compra
										{ticket.max_quantity_per_purchase ? `, máximo de ${ticket.max_quantity_per_purchase}` : ''}.
									</li>
									{ticket.sale_start_date && <li>Vendas a partir de {eventDateTime(ticket.sale_start_date)}.</li>}
									{ticket.sale_end_date && <li>Vendas até {eventDateTime(ticket.sale_end_date)}.</li>}
									{ticket.allow_installments && (
										<li>
											Parcelamento no cartão habilitado para este ingresso. Confira valores e parcelas disponíveis no
											checkout.
										</li>
									)}
									{ticket.allow_pix_installments && (
										<li>
											Parcelamento no Pix habilitado. O ingresso é liberado somente após a quitação integral de todas as
											parcelas.
										</li>
									)}
									<li>
										As formas de pagamento e condições disponíveis são apresentadas no checkout. Boleto sempre à vista.
									</li>
								</ul>
							</details>
						</li>
					);
				})}
			</ul>
			{!purchase.tickets.length && (
				<p className="rounded-xl bg-muted p-4 text-sm text-muted-foreground">
					Os ingressos ainda não estão disponíveis. Acompanhe esta página.
				</p>
			)}
			{!purchase.closed && (
				<Link
					href={purchase.href}
					className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#743DF5]"
				>
					Escolher meus ingressos
					<ArrowRight className="size-4" aria-hidden />
				</Link>
			)}
		</EventSection>
	);
}
