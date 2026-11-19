'use client';
import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowUpRight, CalendarDays, Check, LockKeyhole, MapPin, UsersRound } from 'lucide-react';
import type { NominalTicket, TicketPurchaseDetails } from '@events-manager/contracts';
import { Button } from '@/components/ui/button';
import Container from '@/components/ui/container';
import { formatCurrency } from '@/lib/formatters';
import { NameAttendeeDialog } from './NameAttendeeDialog';
import { TicketPass } from './TicketPass';
import { PurchasePayments } from './PurchasePayments';
import { getTicketAccess } from '../ticket-access';
import { purchaseDate } from '../purchases';

export function PurchaseDetails({ purchaseId }: { purchaseId: string }) {
	const queryClient = useQueryClient();
	const key = ['ticket-purchase', purchaseId];
	const [editing, setEditing] = useState<NominalTicket | null>(null);
	const query = useQuery<TicketPurchaseDetails>({
		queryKey: key,
		queryFn: async () => {
			const response = await fetch(`/api/user/purchases/${purchaseId}`, { credentials: 'include' });
			const data = await response.json();
			if (!response.ok) throw new Error(data.detail || 'Não foi possível carregar a compra.');

			return data;
		},
		retry: false,
		refetchInterval: (state) =>
			state.state.data?.tickets.some((ticket) => ticket.registration.payment_status === 'pending') ? 10000 : false,
	});
	const purchase = query.data;
	if (!purchase)
		return (
			<Container className="py-12">
				<Button asChild variant="ghost">
					<Link href="/perfil?section=ingressos">
						<ArrowLeft className="size-4" />
						Meus ingressos
					</Link>
				</Button>
				{query.isError ? (
					<div role="alert" className="mt-6 rounded-2xl border p-6">
						<p>{query.error.message}</p>
						<Button className="mt-4" onClick={() => query.refetch()}>
							Tentar novamente
						</Button>
					</div>
				) : (
					<p role="status" className="mt-6">
						Carregando sua compra…
					</p>
				)}
			</Container>
		);
	const ticket = purchase.tickets[0];
	if (!ticket) return null;
	const allPaid = purchase.tickets.every((item) => getTicketAccess(item).paymentConfirmed);
	const pixPending = ticket.registration.is_installment_payment && !allPaid;
	const owned = ticket.purchased_by_me;
	const total = purchase.tickets.reduce((sum, item) => sum + item.total_amount, 0);
	const paid = purchase.installments
		.filter((item) => item.status === 'paid')
		.reduce((sum, item) => sum + item.amount, 0);
	const missing = purchase.tickets.filter((item) => !item.attendee_name || !item.attendee_email).length;
	const cancelled = ticket.registration.status === 'cancelled' || ticket.registration.payment_status === 'refunded';
	const status = allPaid ? 'Compra confirmada' : (getTicketAccess(ticket).notice?.label ?? 'Aguardando pagamento');
	function saved(updated: NominalTicket) {
		queryClient.setQueryData<TicketPurchaseDetails>(key, (current) =>
			current
				? { ...current, tickets: current.tickets.map((item) => (item.id === updated.id ? updated : item)) }
				: current,
		);
		setEditing(null);
	}

	return (
		<div className="min-h-screen bg-[#FAF9FD] pb-16 text-[#231A33]">
			<Container className="pt-6">
				<Link
					href="/perfil?section=ingressos"
					className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-primary"
				>
					<ArrowLeft className="size-4" />
					Meus ingressos
				</Link>
				<header className="relative mb-7 overflow-hidden rounded-[2rem] border border-[#E4DAF7] bg-[#F3EEFF] p-6 sm:p-9">
					<div className="relative z-10 max-w-2xl sm:pr-24">
						<p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-primary">
							{allPaid ? <Check className="size-3.5" /> : <LockKeyhole className="size-3.5" />}
							{status}
						</p>
						<h1 className="text-2xl font-semibold tracking-tight sm:text-4xl">{ticket.event.title}</h1>
						<div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
							<p className="flex items-center gap-2">
								<CalendarDays className="size-4" />
								{purchaseDate(ticket.event.start_date)}
							</p>
							<p className="flex items-center gap-2">
								<MapPin className="size-4" />
								{ticket.event.location_name || 'Evento online'}
							</p>
						</div>
						<Link
							href={`/eventos/${ticket.event.slug}`}
							className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary"
						>
							Ver evento
							<ArrowUpRight className="size-4" />
						</Link>
					</div>
					<Image
						src="/illustrations/tickets/purchase-tickets.png"
						priority
						alt=""
						width={300}
						height={200}
						className="absolute -right-4 bottom-0 hidden h-48 w-64 object-contain opacity-90 md:block lg:h-56 lg:w-80"
					/>
				</header>
				<div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
					<div className="min-w-0 space-y-7">
						{pixPending && !cancelled ? (
							<div className="flex items-start gap-3 rounded-2xl border border-[#E4DAF7] bg-white p-5">
								<LockKeyhole className="mt-0.5 size-5 shrink-0 text-primary" />
								<div>
									<p className="text-sm font-semibold">Seu lugar está reservado</p>
									<p className="mt-1 text-sm leading-relaxed text-muted-foreground">
										Os ingressos e seus QR Codes serão liberados somente após o pagamento de todas as parcelas do Pix.
										Acompanhe os vencimentos abaixo.
									</p>
								</div>
							</div>
						) : null}
						{owned ? (
							<PurchasePayments
								ticket={ticket}
								installments={purchase.installments}
								onRefresh={() => void query.refetch()}
							/>
						) : null}
						<section aria-labelledby="tickets-heading" className="space-y-5">
							<div className="flex flex-wrap items-center justify-between gap-2">
								<h2 id="tickets-heading" className="text-xl font-semibold">
									{purchase.tickets.length === 1 ? 'Seu ingresso' : 'Seus ingressos'}
								</h2>
								<span className="rounded-full border bg-white px-3 py-1 text-xs text-muted-foreground">
									{purchase.tickets.length} {purchase.tickets.length === 1 ? 'ingresso' : 'ingressos'}
								</span>
							</div>
							{missing > 0 && owned ? (
								<div className="flex items-start gap-3 rounded-2xl bg-[#F3EEFF] p-4 text-sm">
									<UsersRound className="size-5 shrink-0 text-primary" />
									<p>
										Falta informar {missing === 1 ? 'um participante' : `${missing} participantes`}. Preencha nome e
										e-mail nos ingressos de convidados abaixo. Seu próprio ingresso permanece em seu nome.
									</p>
								</div>
							) : null}
							{purchase.tickets.map((item, index) => (
								<TicketPass key={item.id} ticket={item} index={index + 1} onChangeAttendee={setEditing} />
							))}
						</section>
					</div>
					<aside className="space-y-5 rounded-3xl border bg-white p-6 lg:sticky lg:top-24">
						<h2 className="text-lg font-semibold">Resumo da compra</h2>
						<dl className="space-y-4 text-sm">
							<div>
								<dt className="text-muted-foreground">Pedido</dt>
								<dd className="mt-1 break-all font-mono text-xs">{purchase.id}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Realizado em</dt>
								<dd className="mt-1">{purchaseDate(ticket.registration.date_created)}</dd>
							</div>
							<div>
								<dt className="text-muted-foreground">Comprador</dt>
								<dd className="mt-1">{ticket.registration.participant_name}</dd>
							</div>
							<div className="flex justify-between border-t pt-4">
								<dt>Total</dt>
								<dd className="text-lg font-semibold">{formatCurrency(total)}</dd>
							</div>
							{purchase.installments.length ? (
								<>
									<div className="flex justify-between">
										<dt className="text-muted-foreground">Pago no Pix</dt>
										<dd>{formatCurrency(paid)}</dd>
									</div>
									<div className="flex justify-between">
										<dt className="text-muted-foreground">Saldo pendente</dt>
										<dd>{formatCurrency(Math.max(0, total - paid))}</dd>
									</div>
								</>
							) : null}
						</dl>
						{allPaid && ticket.registration.receipt_url && owned ? (
							<Button asChild variant="outline" className="w-full">
								<a href={ticket.registration.receipt_url} target="_blank" rel="noopener noreferrer">
									Ver comprovante
									<ArrowUpRight className="size-4" />
								</a>
							</Button>
						) : null}
						<p className="border-t pt-4 text-xs leading-relaxed text-muted-foreground">
							Cada ingresso tem um QR Code único. Apresente o seu no dia do evento junto com um documento com foto.
						</p>
					</aside>
				</div>
			</Container>
			{editing && !editing.is_buyer ? (
				<NameAttendeeDialog ticket={editing} onClose={() => setEditing(null)} onSaved={saved} />
			) : null}
		</div>
	);
}
