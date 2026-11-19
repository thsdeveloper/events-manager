'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { NominalTicket, PurchaseInstallment, TransparentPayment } from '@events-manager/contracts';
import { Check, Clock3, CreditCard, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PaymentInstructions } from '@/features/checkout/components/PaymentInstructions';
import { formatCurrency } from '@/lib/formatters';
import { purchaseDate, purchasePaymentLabel } from '../purchases';
export function PurchasePayments({
	ticket,
	installments,
	onRefresh,
}: {
	ticket: NominalTicket;
	installments: PurchaseInstallment[];
	onRefresh?(): void;
}) {
	const [canSimulate, setCanSimulate] = useState(false);
	const [active, setActive] = useState<string | null>(null);
	const [loading, setLoading] = useState<string | null>(null);
	const [payment, setPayment] = useState<TransparentPayment | null>(null);
	const [error, setError] = useState('');
	const paid = installments.filter((item) => item.status === 'paid');
	const credit = ['card', 'credit_card'].includes(ticket.registration.payment_method?.toLowerCase() ?? '');
	const cancelled = ticket.registration.status === 'cancelled' || ticket.registration.payment_status === 'refunded';
	const canPay =
		!cancelled &&
		ticket.registration.payment_status === 'pending' &&
		ticket.registration.is_installment_payment &&
		ticket.registration.payment_method?.toLowerCase() === 'pix';
	const orderedInstallments = [...installments].sort((a, b) => a.installment_number - b.installment_number);
	const firstPendingId = canPay
		? orderedInstallments.find((item) => ['pending', 'overdue'].includes(item.status))?.id
		: undefined;
	const automaticallyOpened = useRef(new Set<string>());
	const pay = useCallback(async (id: string) => {
		setLoading(id);
		setActive(null);
		setPayment(null);
		setError('');
		try {
			const response = await fetch(`/api/installments/${id}/generate-pix`, {
				method: 'POST',
				credentials: 'include',
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.detail || 'Não foi possível gerar o Pix.');
			setPayment({
				id: data.payment.provider_transaction_id,
				method: 'PIX',
				status: 'PENDING',
				amountInCents: Math.round(data.payment.amount * 100),
				copyPasteCode: data.payment.pix_copy_paste,
				qrCodeBase64: data.payment.pix_qr_code,
				expiresAt: data.payment.expires_at,
				barcode: null,
				boletoUrl: null,
			});
			setCanSimulate(data.canSimulatePayment === true);
			setActive(id);
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Tente novamente.');
		} finally {
			setLoading(null);
		}
	}, []);
	useEffect(() => {
		if (!firstPendingId || automaticallyOpened.current.has(firstPendingId)) return;
		// Purchase polling and Strict Mode must not request the same charge again.
		// A failed automatic request can still be retried with the payment button.
		automaticallyOpened.current.add(firstPendingId);
		void pay(firstPendingId);
	}, [firstPendingId, pay]);
	async function simulate() {
		if (!active || !canSimulate) return;
		setLoading(active);
		setError('');
		try {
			const response = await fetch(`/api/installments/${active}/simulate-payment`, {
				method: 'POST',
				credentials: 'include',
			});
			const data = await response.json();
			if (!response.ok) throw new Error(data.detail || 'Não foi possível confirmar a parcela.');
			setActive(null);
			onRefresh?.();
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Tente novamente.');
		} finally {
			setLoading(null);
		}
	}

	return (
		<section aria-labelledby="payment-heading" className="rounded-3xl border bg-white p-5 sm:p-7">
			<div className="flex items-center gap-3">
				<span className="rounded-xl bg-[#F3EEFF] p-2.5 text-primary">
					<CreditCard className="size-5" />
				</span>
				<div>
					<h2 id="payment-heading" className="text-lg font-semibold">
						Pagamento
					</h2>
					<p className="mt-0.5 text-sm text-muted-foreground">{purchasePaymentLabel(ticket)}</p>
				</div>
			</div>
			{credit ? (
				<p className="mt-4 text-sm leading-relaxed text-muted-foreground">
					O ingresso é liberado após a aprovação do cartão. As parcelas são cobradas na fatura do seu banco; a Flouvi
					não acompanha os pagamentos dessa fatura.
				</p>
			) : null}
			{installments.length > 0 ? (
				<>
					<div className="mb-5 mt-6">
						<div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm">
							<span className="font-medium">
								{paid.length} de {installments.length} parcelas pagas
							</span>
							<span className="text-muted-foreground">
								{formatCurrency(paid.reduce((sum, item) => sum + item.amount, 0))} pagos
							</span>
						</div>
						<Progress
							aria-label="Progresso do pagamento"
							value={(paid.length / installments.length) * 100}
							className="h-2 w-full overflow-hidden rounded-full accent-[#743DF5]"
						/>
					</div>
					<ul aria-label="Parcelas do Pix" className="divide-y">
						{orderedInstallments.map((item) => {
							const overdue =
								item.status === 'overdue' ||
								(item.status === 'pending' &&
									new Date(item.due_date.length === 10 ? `${item.due_date}T23:59:59` : item.due_date).getTime() <
										Date.now());
							const label =
								item.status === 'paid'
									? 'Paga'
									: item.status === 'cancelled' || cancelled
										? 'Cancelada'
										: overdue
											? 'Vencida'
											: 'A vencer';

							return (
								<li key={item.id} className="py-4">
									<div className="flex flex-wrap items-center gap-3">
										<span
											className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.status === 'paid' ? 'bg-[#F3EEFF] text-primary' : 'bg-muted text-muted-foreground'}`}
										>
											{item.status === 'paid' ? <Check className="size-4" /> : <Clock3 className="size-4" />}
										</span>
										<div className="min-w-0 flex-1">
											<p className="text-sm font-semibold">
												Parcela {item.installment_number}{' '}
												<span className="ml-2 font-normal text-muted-foreground">{formatCurrency(item.amount)}</span>
											</p>
											<p className="mt-1 text-xs text-muted-foreground">
												{item.status === 'paid'
													? `Paga em ${purchaseDate(item.paid_at)}`
													: `Vencimento ${purchaseDate(item.due_date)}`}
											</p>
										</div>
										<span className={`text-xs font-medium ${overdue ? 'text-amber-700' : 'text-muted-foreground'}`}>
											{label}
										</span>
										{canPay && ['pending', 'overdue'].includes(item.status) && active !== item.id ? (
											<Button size="sm" variant="outline" disabled={loading !== null} onClick={() => pay(item.id)}>
												<QrCode className="size-3.5" />
												{loading === item.id ? 'Gerando…' : 'Pagar parcela'}
											</Button>
										) : null}
									</div>
									{canPay && active === item.id && payment && ['pending', 'overdue'].includes(item.status) ? (
										<div className="mt-4 rounded-2xl bg-[#F3EEFF]/40 p-4">
											<p className="mb-4 text-sm font-medium">
												Pix da parcela {item.installment_number} · {formatCurrency(item.amount)}
											</p>
											<PaymentInstructions payment={payment} />
											{canSimulate ? (
												<Button
													className="mt-3 w-full"
													variant="outline"
													disabled={loading !== null}
													onClick={simulate}
												>
													Confirmar parcela de teste
												</Button>
											) : null}
											<Button variant="ghost" className="mt-2" onClick={() => setActive(null)}>
												Fechar código
											</Button>
										</div>
									) : null}
								</li>
							);
						})}
					</ul>
				</>
			) : (
				<p className="mt-4 text-sm text-muted-foreground">
					{ticket.registration.payment_status === 'paid'
						? 'Pagamento aprovado.'
						: ticket.registration.payment_status === 'free'
							? 'Não há valor a pagar.'
							: 'Aguardando a confirmação do pagamento.'}
				</p>
			)}
			{error ? (
				<p role="alert" className="mt-3 text-sm text-destructive">
					{error}
				</p>
			) : null}
		</section>
	);
}
