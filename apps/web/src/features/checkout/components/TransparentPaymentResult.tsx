'use client';
import Link from 'next/link';
import type { TransparentCheckoutResult } from '@events-manager/contracts';
import { CheckCircle2, Clock3, Copy, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/formatters';
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
	const confirmed = result.status === 'confirmed';
	const ended = ['failed', 'cancelled', 'refunded'].includes(result.status);
	const payment = result.payment;
	const title = confirmed
		? 'Pagamento confirmado'
		: ended
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
	async function copy(value: string) {
		try {
			await navigator.clipboard.writeText(value);
			toast({ title: 'Código copiado' });
		} catch {
			toast({
				title: 'Não foi possível copiar',
				description: 'Selecione e copie o código abaixo.',
				variant: 'destructive',
			});
		}
	}

	return (
		<section
			aria-label="Andamento do pagamento"
			className="mx-auto max-w-2xl space-y-5 rounded-2xl border bg-card p-6 sm:p-8"
		>
			{confirmed ? <CheckCircle2 className="size-10 text-emerald-600" /> : <Clock3 className="size-10 text-primary" />}
			<h2 className="text-2xl font-semibold">{title}</h2>
			{confirmed ? (
				<>
					<p>Seus ingressos estão disponíveis na sua conta. A confirmação também será enviada por e-mail.</p>
					<Button asChild>
						<Link href="/my-registrations">Ver meus ingressos</Link>
					</Button>
					<Button type="button" variant="outline" onClick={onReset}>
						Fazer nova compra
					</Button>
				</>
			) : (
				<>
					{result.message ? <p>{result.message}</p> : null}
					{!ended ? (
						<p className="text-sm text-muted-foreground">
							A compra será confirmada após a verificação do pagamento. Não refaça a compra enquanto esta tentativa
							estiver pendente.
						</p>
					) : (
						<Button type="button" onClick={onReset}>
							Tentar outro pagamento
						</Button>
					)}
					{payment && !ended ? (
						<>
							<p className="text-2xl font-semibold">{formatCurrency(payment.amountInCents / 100)}</p>
							{payment.expiresAt ? (
								<p className="text-sm">Vencimento: {new Date(payment.expiresAt).toLocaleString('pt-BR')}</p>
							) : null}
							{payment.qrCodeBase64 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(payment.qrCodeBase64) ? (
								<img
									src={payment.qrCodeBase64}
									alt="QR Code Pix para pagar esta compra"
									width={224}
									height={224}
									className="mx-auto rounded-lg border bg-white p-3"
								/>
							) : null}
							{payment.copyPasteCode ? (
								<div className="space-y-2">
									<Label htmlFor="transparent-pix-code">Pix copia e cola</Label>
									<Input id="transparent-pix-code" value={payment.copyPasteCode} readOnly />
									<Button type="button" variant="outline" onClick={() => copy(payment.copyPasteCode!)}>
										<Copy className="size-4" />
										Copiar código Pix
									</Button>
								</div>
							) : null}
							{payment.barcode ? (
								<div className="space-y-2">
									<Label htmlFor="transparent-boleto-code">Linha digitável do boleto</Label>
									<Input id="transparent-boleto-code" value={payment.barcode} readOnly />
									<Button type="button" variant="outline" onClick={() => copy(payment.barcode!)}>
										Copiar linha digitável
									</Button>
									<p className="text-xs text-muted-foreground">
										A compensação do boleto pode levar até 3 dias úteis. Se pagar pelo Pix do boleto, não pague também a
										linha digitável.
									</p>
								</div>
							) : null}
							{payment.boletoUrl && /^https:\/\/(app\.)?abacatepay\.com\//.test(payment.boletoUrl) ? (
								<Button asChild variant="outline">
									<a href={payment.boletoUrl} target="_blank" rel="noopener noreferrer">
										Abrir boleto para impressão
									</a>
								</Button>
							) : null}
						</>
					) : null}
					{!ended ? (
						<Button type="button" onClick={onRefresh} disabled={isRefreshing}>
							{isRefreshing ? 'Verificando…' : 'Verificar pagamento'}
						</Button>
					) : null}
					{statusError ? (
						<p role="status" className="text-sm text-amber-800">
							Não foi possível atualizar agora. Sua tentativa foi preservada; verifique novamente em instantes.
						</p>
					) : null}
				</>
			)}
			<p className="flex items-center gap-2 text-xs text-muted-foreground">
				<ShieldCheck className="size-4" />
				Pagamento processado com segurança pela AbacatePay.
			</p>
		</section>
	);
}
