import type { CheckoutStatus } from '@events-manager/contracts';
import { ExternalLink, UserRound, UserRoundPlus } from 'lucide-react';
import Link from 'next/link';

interface CheckoutRegistrationListProps {
	registrations: CheckoutStatus['registrations'];
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
	free: 'gratuito',
	paid: 'pago',
	pending: 'aguardando pagamento',
	refunded: 'reembolsado',
};

/**
 * Pedidos de uma compra na tela de confirmação, com os ingressos nominais de
 * cada um. Quando o provedor já emitiu o comprovante, ele fica a um clique dali
 * mesmo; um ingresso sem participante aponta para a área onde ele é nomeado.
 */
export function CheckoutRegistrationList({ registrations }: CheckoutRegistrationListProps) {
	return (
		<div className="space-y-3 rounded-lg bg-muted p-5">
			{registrations.map((registration) => (
				<div key={registration.id} className="space-y-3 rounded-md bg-background p-4">
					<div className="flex items-start justify-between gap-4">
						<div className="space-y-1">
							<p className="font-medium">{registration.event.title}</p>
							<p className="text-sm text-muted-foreground">
								Status: {PAYMENT_STATUS_LABEL[registration.paymentStatus ?? ''] ?? registration.status}
							</p>
							{registration.receiptUrl ? (
								<a
									href={registration.receiptUrl}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
								>
									Ver comprovante
									<ExternalLink className="size-3.5" aria-hidden="true" />
								</a>
							) : null}
						</div>
						{registration.tickets.length === 0 && registration.ticketCode ? (
							<code className="rounded bg-muted px-2 py-1 text-xs">{registration.ticketCode}</code>
						) : null}
					</div>
					{registration.tickets.length > 0 ? (
						<ul className="divide-y rounded-md border bg-background">
							{registration.tickets.map((ticket) => (
								<li
									key={ticket.id}
									className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-sm"
								>
									<span className="inline-flex min-w-0 items-center gap-2">
										{ticket.attendeeName ? (
											<UserRound className="size-4 shrink-0 text-primary" aria-hidden />
										) : (
											<UserRoundPlus className="size-4 shrink-0 text-warning" aria-hidden />
										)}
										<span className="truncate">
											{ticket.attendeeName ? (
												<>
													<span className="font-medium text-foreground">{ticket.attendeeName}</span>
													{ticket.isBuyer ? <span className="text-muted-foreground"> (você)</span> : null}
												</>
											) : (
												<span className="text-muted-foreground">participante a informar</span>
											)}
										</span>
										{ticket.ticketType ? <span className="text-muted-foreground">· {ticket.ticketType}</span> : null}
									</span>
									<span className="inline-flex items-center gap-3">
										<code className="rounded bg-muted px-2 py-0.5 text-xs">{ticket.ticketCode}</code>
										{ticket.attendeeName ? null : (
											<Link
												href="/perfil?section=ingressos"
												className="text-xs font-medium text-primary hover:underline"
											>
												Informar participante
											</Link>
										)}
									</span>
								</li>
							))}
						</ul>
					) : null}
				</div>
			))}
		</div>
	);
}
