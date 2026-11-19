'use client';
import Link from 'next/link';
import { ArrowUpRight, CalendarDays, MapPin, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getTicketAccess } from '../ticket-access';
import { purchaseDate, purchasePaymentLabel, type TicketPurchase } from '../purchases';
import { getMediaAssetUrl } from '@/lib/media';
import { formatCurrency } from '@/lib/formatters';
export function PurchaseCard({ purchase, variant = 'grid' }: { purchase: TicketPurchase; variant?: 'grid' | 'list' }) {
	const ticket = purchase.tickets[0];
	const paid = purchase.tickets.every((item) => getTicketAccess(item).paymentConfirmed);
	const missing = purchase.tickets.filter((item) => !item.attendee_name || !item.attendee_email).length;
	const total = purchase.tickets.reduce((sum, item) => sum + item.total_amount, 0);
	const cover = ticket.event.cover_image;
	const coverUrl = getMediaAssetUrl(cover);
	const owned = ticket.purchased_by_me ?? Boolean(ticket.is_buyer || ticket.can_edit_attendee);

	return (
		<article
			aria-label={`Compra para ${ticket.event.title}`}
			className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${variant === 'list' ? 'sm:grid sm:grid-cols-[160px_1fr]' : ''}`}
		>
			<div className={`relative overflow-hidden bg-[#F3EEFF] ${variant === 'list' ? 'h-32 sm:h-full' : 'h-32'}`}>
				{coverUrl ? (
					<img src={coverUrl} alt="" className="size-full object-cover" />
				) : (
					<img
						src="/illustrations/tickets/purchase-tickets.png"
						alt=""
						className="mx-auto h-full w-48 object-contain"
					/>
				)}
				<span className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">
					{paid ? 'Compra confirmada' : (getTicketAccess(ticket).notice?.label ?? 'Aguardando pagamento')}
				</span>
			</div>
			<div className="space-y-4 p-5">
				<div>
					<p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
						<Ticket className="size-3.5" />
						{purchase.tickets.length} {purchase.tickets.length === 1 ? 'ingresso' : 'ingressos'}
					</p>
					<h3 className="text-lg font-semibold leading-snug">{ticket.event.title}</h3>
				</div>
				<div className="space-y-1.5 text-xs text-muted-foreground">
					<p className="flex gap-2">
						<CalendarDays className="size-3.5 shrink-0" />
						{purchaseDate(ticket.event.start_date)}
					</p>
					<p className="flex gap-2">
						<MapPin className="size-3.5 shrink-0" />
						{ticket.event.location_name || 'Evento online'}
					</p>
				</div>
				{missing > 0 ? (
					<p className="rounded-lg bg-[#F3EEFF] px-3 py-2 text-xs text-primary">
						{missing} {missing === 1 ? 'participante a informar' : 'participantes a informar'}
					</p>
				) : (
					<p className="truncate text-xs text-muted-foreground">
						{purchase.tickets.length === 1 ? ticket.attendee_name : 'Todos os participantes informados'}
					</p>
				)}
				{!owned ? (
					<p className="text-xs text-muted-foreground">Comprado por {ticket.registration.participant_name}</p>
				) : null}
				{purchase.tickets.length === 1 ? (
					<p className="font-mono text-[10px] text-muted-foreground">{ticket.ticket_code}</p>
				) : null}
				<div className="flex items-end justify-between gap-2 border-t border-dashed pt-4">
					<div>
						<p className="text-[11px] text-muted-foreground">{purchasePaymentLabel(ticket)}</p>
						<p className="mt-1 font-semibold">{formatCurrency(total)}</p>
					</div>
					<Button asChild size="sm" variant="outline" className="rounded-lg">
						<Link href={`/perfil/ingressos/${purchase.id}`}>
							Ver detalhes
							<ArrowUpRight className="size-4" />
						</Link>
					</Button>
				</div>
			</div>
		</article>
	);
}
