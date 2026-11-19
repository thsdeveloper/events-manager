'use client';

import Image from 'next/image';
import type { TransparentCheckoutResult } from '@events-manager/contracts';
import { Clock3, FlaskConical, RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { useSimulatePayment } from '../api/useSimulatePayment';
import { PaymentInstructions } from './PaymentInstructions';
import { PurchaseSuccess } from './PurchaseSuccess';

export function TransparentPaymentResult({
	result,
	onRefresh,
	onReset,
	isRefreshing = false,
	statusError = false,
}: {
	result: TransparentCheckoutResult;
	onRefresh(): void;
	onReset(): void;
	isRefreshing?: boolean;
	statusError?: boolean;
}) {
	const simulation = useSimulatePayment(result.attemptId, onRefresh);
	if (result.status === 'confirmed')
		return <PurchaseSuccess purchaseId={result.attemptId} payment={result.payment} onReset={onReset} />;
	const ended = ['failed', 'cancelled', 'refunded'].includes(result.status);
	const payment = result.payment;
	const title = ended
		? result.status === 'refunded'
			? 'Pagamento reembolsado'
			: 'Pagamento não concluído'
		: result.status === 'processing'
			? 'Estamos verificando seu pagamento'
			: result.status === 'disputed'
				? 'Pagamento em análise'
				: payment?.method === 'PIX'
					? 'Pague com Pix'
					: payment?.method === 'BOLETO'
						? 'Pague seu boleto'
						: 'Aguardando confirmação do cartão';

	return (
		<section
			aria-label="Andamento do pagamento"
			className="w-full overflow-hidden rounded-3xl border bg-white shadow-sm"
		>
			<header className="flex flex-wrap items-center gap-4 border-b bg-[#F3EEFF]/40 p-5 sm:gap-5 sm:px-8 sm:py-6">
				<Image
					src="/illustrations/checkout/payment-pending.png"
					alt=""
					width={88}
					height={88}
					className="size-16 object-contain sm:size-20"
				/>
				<div className="min-w-0 flex-1">
					<p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
						{ended ? 'Andamento da compra' : 'Falta só o pagamento'}
					</p>
					<h2 className="text-xl font-semibold tracking-tight text-[#231A33] sm:text-2xl">{title}</h2>
					<p className="mt-1.5 text-sm text-muted-foreground">
						{ended ? 'Confira o status abaixo para continuar.' : 'Conclua esta etapa para receber seus ingressos.'}
					</p>
				</div>
				{payment && !ended ? (
					<dl className="w-full border-t pt-4 sm:ml-auto sm:w-auto sm:border-0 sm:pl-6 sm:pt-0 sm:text-right">
						<dt className="text-xs text-muted-foreground">Total a pagar</dt>
						<dd className="mt-1 text-2xl font-semibold tracking-tight text-[#231A33] sm:text-3xl">
							{formatCurrency(payment.amountInCents / 100)}
						</dd>
					</dl>
				) : null}
			</header>
			<div className="space-y-6 p-5 sm:p-8">
				{payment?.expiresAt && !ended ? (
					<p className="flex items-center gap-2 text-xs text-muted-foreground">
						<Clock3 className="size-4" aria-hidden="true" />
						Vencimento:{' '}
						<time dateTime={payment.expiresAt} className="font-medium text-foreground">
							{new Date(payment.expiresAt).toLocaleString('pt-BR')}
						</time>
					</p>
				) : null}
				{result.message ? (
					<p role="status" className="text-sm text-muted-foreground">
						{result.message}
					</p>
				) : null}
				{payment && !ended && result.status !== 'disputed' ? (
					<PaymentInstructions key={payment.id} payment={payment} />
				) : null}
				{ended ? (
					<Button type="button" onClick={onReset}>
						Tentar outro pagamento
					</Button>
				) : (
					<div className="flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-center sm:justify-between">
						<div className="max-w-lg">
							<p className="flex items-center gap-2 text-sm font-medium">
								<span aria-hidden="true" className="size-2 rounded-full bg-primary" />A confirmação será atualizada
								automaticamente
							</p>
							<p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
								Não refaça a compra enquanto esta tentativa estiver pendente.
							</p>
						</div>
						<Button
							type="button"
							variant="outline"
							className="shrink-0 rounded-xl"
							onClick={onRefresh}
							disabled={isRefreshing}
						>
							<RefreshCw className={`size-4 ${isRefreshing ? 'animate-spin motion-reduce:animate-none' : ''}`} />
							{isRefreshing ? 'Verificando…' : 'Verificar pagamento'}
						</Button>
					</div>
				)}
				{statusError ? (
					<p role="status" className="text-sm text-amber-800">
						Não foi possível atualizar agora. Sua tentativa foi preservada; verifique novamente em instantes.
					</p>
				) : null}
				{result.canSimulatePayment && result.status === 'pending' ? (
					<div className="space-y-3 rounded-2xl border border-dashed border-primary/25 bg-[#F3EEFF]/50 p-4">
						<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
							<div>
								<p className="flex items-center gap-2 text-sm font-medium text-primary">
									<FlaskConical className="size-4" />
									Ambiente de testes
								</p>
								<p className="mt-1 text-xs text-muted-foreground">Confirme esta compra sem movimentar dinheiro.</p>
							</div>
							<Button
								type="button"
								variant="outline"
								className="shrink-0 rounded-xl border-primary/20 text-primary"
								disabled={simulation.isPending}
								onClick={() => simulation.mutate()}
							>
								{simulation.isPending ? 'Confirmando…' : 'Confirmar pagamento de teste'}
							</Button>
						</div>
						{simulation.error ? (
							<p role="alert" className="text-sm text-destructive">
								{simulation.error.message}
							</p>
						) : null}
					</div>
				) : null}
			</div>
			<footer className="flex items-center justify-center gap-2 border-t bg-[#F3EEFF]/20 px-5 py-3 text-xs text-muted-foreground">
				<ShieldCheck className="size-4 shrink-0" />
				Pagamento protegido e processado pela AbacatePay.
			</footer>
		</section>
	);
}
