import type { Event } from '@events-manager/contracts';
import { ArrowUpRight, Check, LockKeyhole, Ticket } from 'lucide-react';
import Link from 'next/link';
import { formatCurrency } from '@/lib/formatters';
import { eventPurchase } from '../public-event';

export const purchaseLinkClass =
	'inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#743DF5] px-5 py-3 text-center text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#6030D4] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#743DF5]';

export function EventPurchasePanel({ event, now }: { event: Event; now: number }) {
	const purchase = eventPurchase(event, now);

	return (
		<aside
			aria-label="Sua experiência começa aqui"
			className="min-w-0 lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:self-stretch"
		>
			<div className="space-y-4 lg:sticky lg:top-28">
				<div className="relative overflow-hidden rounded-3xl border border-[#743DF5]/15 bg-white shadow-[0_12px_48px_-24px_#743DF540] dark:bg-card">
					<div className="flex items-center gap-3 bg-[#F3EEFF] px-6 py-5 text-[#231A33]">
						<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#743DF5] text-white">
							<Ticket className="size-5" aria-hidden />
						</span>
						<div>
							<h2 className="font-bold">Sua experiência começa aqui</h2>
							<p className="mt-0.5 text-xs text-[#665B76]">Escolha seu ingresso e venha fazer parte.</p>
						</div>
					</div>
					<div className="p-6">
						{purchase.closed ? (
							<p role="status" className="rounded-xl bg-muted p-4 text-sm font-medium">
								{purchase.closed}
							</p>
						) : (
							<>
								<p className="text-sm text-muted-foreground">
									{purchase.free ? 'Entrada gratuita' : 'Ingressos a partir de'}
								</p>
								<p className="mt-1 text-4xl font-bold tracking-tight">
									{purchase.free ? 'Grátis' : formatCurrency(purchase.price!)}
								</p>
								<p className="mt-2 text-xs text-muted-foreground">
									{purchase.free
										? 'Garanta sua inscrição no checkout.'
										: 'Valor por pessoa, com a taxa de serviço incluída.'}
								</p>
								<Link href={purchase.href} className={`${purchaseLinkClass} mt-6 w-full`}>
									{purchase.free ? 'Inscrever-se grátis' : 'Comprar ingressos'}
									<ArrowUpRight className="size-4 shrink-0" aria-hidden />
								</Link>
								<p className="mt-3 text-center text-xs text-muted-foreground">
									Você escolhe o tipo e a quantidade na próxima etapa.
								</p>
							</>
						)}
						<div className="my-6 border-t border-dashed border-[#743DF5]/20" />
						<ul className="space-y-3 text-sm text-muted-foreground">
							<li className="flex items-center gap-2">
								<Check className="size-4 shrink-0 text-[#743DF5]" aria-hidden />
								Ingressos digitais no seu perfil
							</li>
							<li className="flex items-center gap-2">
								<Check className="size-4 shrink-0 text-[#743DF5]" aria-hidden />
								Dados e participantes no checkout
							</li>
						</ul>
					</div>
				</div>
				<p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
					<LockKeyhole className="size-3.5" aria-hidden />
					Compra pela Flouvi
				</p>
			</div>
		</aside>
	);
}

export function MobileEventPurchase({ event, now }: { event: Event; now: number }) {
	const purchase = eventPurchase(event, now);
	if (purchase.closed) return null;

	return (
		<div
			aria-label="Compra rápida"
			className="fixed inset-x-0 bottom-0 z-40 border-t border-[#743DF5]/15 bg-white/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur-md dark:bg-card/95 lg:hidden"
		>
			<div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
				<div className="shrink-0">
					<p className="text-[11px] text-muted-foreground">{purchase.free ? 'Entrada gratuita' : 'A partir de'}</p>
					<p className="text-lg font-bold">{purchase.free ? 'Grátis' : formatCurrency(purchase.price!)}</p>
				</div>
				<Link href={purchase.href} className={purchaseLinkClass}>
					{purchase.free ? 'Inscrever-se grátis' : 'Comprar ingressos'}
					<ArrowUpRight className="hidden size-4 min-[360px]:block" aria-hidden />
				</Link>
			</div>
		</div>
	);
}
