'use client';

import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { TicketPurchaseDetails, TransparentPayment } from '@events-manager/contracts';
import { TicketPass } from '@/features/tickets/components/TicketPass';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, Check, Mail, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { PurchaseCelebration } from './PurchaseCelebration';

export function PurchaseSuccess({
	purchaseId,
	detailsId,
	payment,
	onReset,
	children,
}: {
	purchaseId: string;
	detailsId?: string;
	payment?: TransparentPayment | null;
	onReset?(): void;
	children?: ReactNode;
}) {
	const id = detailsId ?? purchaseId;
	const validId = /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id);
	const { data } = useQuery<TicketPurchaseDetails>({
		queryKey: ['ticket-purchase', id],
		enabled: validId,
		retry: false,
		queryFn: async () => {
			const response = await fetch(`/api/user/purchases/${id}`, { credentials: 'include' });
			if (!response.ok) throw new Error('Ingressos indisponíveis');

			return response.json();
		},
	});
	const preview = data?.tickets.find((ticket) => ticket.is_buyer) ?? data?.tickets[0];

	return (
		<section aria-label="Compra confirmada" className="w-full overflow-hidden rounded-3xl border bg-white shadow-sm">
			<PurchaseCelebration purchaseId={purchaseId} />
			<div className="relative px-6 pb-8 pt-6 text-center sm:px-12 sm:pt-8">
				<div
					aria-hidden="true"
					className="absolute inset-x-0 top-0 h-64 bg-gradient-to-b from-[#F3EEFF] to-transparent"
				/>
				<div className="relative">
					<Image
						src="/illustrations/checkout/purchase-success.png"
						alt=""
						width={208}
						height={208}
						priority
						className="mx-auto size-44 object-contain sm:size-52"
					/>
					<p className="mb-3 mt-2 inline-flex items-center gap-1.5 rounded-full bg-[#F3EEFF] px-3 py-1 text-xs font-semibold text-primary">
						<Check className="size-3.5" aria-hidden="true" />
						{payment?.developmentSimulation ? 'Compra de teste' : 'Tudo certo com seus ingressos'}
					</p>
					<h2 className="text-3xl font-semibold tracking-tight text-[#231A33] sm:text-4xl">Compra confirmada!</h2>
					<p className="mx-auto mt-3 max-w-md text-base leading-relaxed text-muted-foreground">
						Agora é só se preparar para viver esse momento. Seus ingressos já estão disponíveis na sua conta.
					</p>
				</div>
			</div>
			<div className="space-y-6 px-6 pb-8 sm:px-12 sm:pb-10">
				{payment ? (
					<dl className="grid grid-cols-2 gap-4 rounded-2xl border border-dashed bg-[#F3EEFF]/30 p-5">
						<div>
							<dt className="text-sm text-muted-foreground">
								{payment.developmentSimulation ? 'Valor da compra de teste' : 'Total pago'}
							</dt>
							<dd className="mt-1 text-xl font-semibold">{formatCurrency(payment.amountInCents / 100)}</dd>
						</div>
						<div className="text-right">
							<dt className="text-sm text-muted-foreground">Forma de pagamento</dt>
							<dd className="mt-1 font-medium">
								{payment.method === 'PIX'
									? 'Pix'
									: payment.method === 'BOLETO'
										? 'Boleto bancário'
										: 'Cartão de crédito'}
							</dd>
						</div>
					</dl>
				) : null}
				{children}
				{preview ? <TicketPass ticket={preview} /> : null}
				{data ? (
					<Link
						className="block text-center text-sm font-medium text-primary hover:underline"
						href={`/perfil/ingressos/${data.id}`}
					>
						Detalhes da compra e participantes
					</Link>
				) : null}
				<div className="grid gap-3 sm:grid-cols-2">
					<Button asChild size="lg" className="h-12 rounded-xl">
						<Link href="/perfil?section=ingressos">
							<Ticket className="size-4" />
							Ver meus ingressos
							<ArrowRight className="ml-auto size-4" />
						</Link>
					</Button>
					<Button asChild variant="outline" size="lg" className="h-12 rounded-xl">
						<Link href="/eventos">Explorar eventos</Link>
					</Button>
				</div>
				<p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-muted-foreground">
					<Mail className="mt-0.5 size-4 shrink-0" />A confirmação também será enviada por e-mail.
				</p>
				{onReset ? (
					<div className="text-center">
						<Button type="button" variant="link" onClick={onReset}>
							Fazer nova compra
						</Button>
					</div>
				) : null}
			</div>
		</section>
	);
}
