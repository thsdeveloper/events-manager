'use client';

import {
	quoteGatewayFee,
	readGatewayFees,
	type OrganizerPaymentSettingsResponse,
	type AcceptedPaymentMethod,
} from '@events-manager/contracts';
import { useState } from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogTrigger,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
	calculateFeesForMethod,
	formatCurrency,
	PAYMENT_METHODS,
	DEFAULT_PUBLIC_FEES,
	type FeeConfig,
	type PublicFeeTable,
	type PaymentMethod,
} from '@/lib/fees';

export function TicketFeeDetails({
	price,
	serviceFeeType,
	feeConfig,
	feeTable,
	isFallback,
	paymentSettings,
	maxInstallments = 12,
}: {
	price: number;
	serviceFeeType: 'passed_to_buyer' | 'absorbed';
	feeConfig: FeeConfig;
	feeTable?: PublicFeeTable;
	isFallback: boolean;
	paymentSettings?: OrganizerPaymentSettingsResponse;
	maxInstallments?: number;
}) {
	const [chosenMethod, setMethod] = useState<PaymentMethod>('pix');
	const [installments, setInstallments] = useState(1);
	const selectedMethods =
		paymentSettings?.settings.accepted_payment_methods ?? (feeTable ? ['PIX', 'CARD', 'BOLETO', 'DEBIT'] : ['CARD']);
	const methodKey = (value: PaymentMethod): AcceptedPaymentMethod =>
		value === 'pix'
			? 'PIX'
			: value === 'boleto' || value === 'boleto_pix'
				? 'BOLETO'
				: value === 'debit'
					? 'DEBIT'
					: 'CARD';
	const methods = PAYMENT_METHODS.filter((item) => selectedMethods.includes(methodKey(item.value)));
	const method = methods.some((item) => item.value === chosenMethod) ? chosenMethod : methods[0].value;
	const period = paymentSettings?.settings.credit_card_settlement_period ?? 'D+1';
	const count = Math.max(1, Math.min(installments, maxInstallments));
	const table = feeTable ?? {
		...DEFAULT_PUBLIC_FEES,
		card_rates: undefined,
		platform_fee_percentage: feeConfig.platformFeePercentage,
		platform_fee_minimum: feeConfig.platformFeeMinimum ?? 0,
		card_fee_percentage: feeConfig.providerPercentageFee,
		card_fee_fixed: feeConfig.providerFixedFee,
	};
	const fees = calculateFeesForMethod(price, serviceFeeType, method, table, { installments: count, period });
	const gateway = readGatewayFees({ ...table });
	const quote = quoteGatewayFee(
		fees.buyerPrice,
		method as 'pix' | 'card' | 'boleto' | 'boleto_pix' | 'debit',
		gateway,
		count,
		period,
	);
	const percent = !table.card_rates && method === 'card' ? table.card_fee_percentage : quote.percentage;
	const fixed = quote.fixed;
	const pending = paymentSettings?.pending_methods.some((item) => item.method === methodKey(method));
	const percentageText = (value: number) => `${value.toLocaleString('pt-BR')}%`;
	const minimumApplied = (table.platform_fee_minimum ?? 0) > (price * table.platform_fee_percentage) / 100;
	const passed = serviceFeeType === 'passed_to_buyer';
	const rows = [
		['Preço base do ingresso', formatCurrency(price)],
		[
			`Taxa da plataforma: ${percentageText(table.platform_fee_percentage)} sobre o preço base`,
			formatCurrency((price * table.platform_fee_percentage) / 100),
		],
		[
			minimumApplied ? 'Taxa mínima aplicada por ingresso' : 'Taxa mínima por ingresso (não aplicada)',
			formatCurrency(table.platform_fee_minimum ?? 0),
		],
		['Taxa da plataforma cobrada (maior entre percentual e mínimo)', formatCurrency(fees.platformFee)],
		[
			passed
				? 'Conveniência: comprador paga a taxa da plataforma'
				: 'Conveniência: organizador absorve a taxa da plataforma',
			formatCurrency(fees.convenienceFee),
		],
		['Total pago pelo comprador', formatCurrency(fees.buyerPrice)],
		[
			`Percentual do gateway: ${percentageText(percent)} sobre ${formatCurrency(fees.buyerPrice)}`,
			formatCurrency((fees.buyerPrice * percent) / 100),
		],
		['Parcela fixa do gateway por transação', formatCurrency(fixed)],
		['Total estimado do gateway (descontado do organizador)', formatCurrency(fees.providerFee)],
		['Taxa da plataforma descontada do preço base', formatCurrency(passed ? 0 : fees.platformFee)],
	];

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-4 h-auto min-h-9 w-full whitespace-normal border-[#743DF5]/25 bg-white text-[#743DF5] hover:border-[#743DF5]/50 hover:bg-[#F3EEFF] hover:text-[#743DF5] focus-visible:ring-[#743DF5]"
				>
					<Info className="size-4 shrink-0" aria-hidden="true" />
					Entender taxas e recebimento
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>Taxas e recebimento por ingresso</DialogTitle>
					<DialogDescription>
						Simulação de uma compra com um ingresso, sem cupom. Veja o cálculo completo e quem paga cada tarifa.
					</DialogDescription>
				</DialogHeader>
				<div className="space-y-2">
					<Label htmlFor="ticket-fee-method">Forma de pagamento da simulação</Label>
					<Select value={method} onValueChange={(value) => setMethod(value as PaymentMethod)}>
						<SelectTrigger id="ticket-fee-method">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{methods.map((item) => (
								<SelectItem key={item.value} value={item.value}>
									{item.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{method === 'card' ? (
					<div className="space-y-2">
						<Label htmlFor="ticket-fee-installments">Parcelas no cartão</Label>
						<Select value={String(count)} onValueChange={(value) => setInstallments(Number(value))}>
							<SelectTrigger id="ticket-fee-installments">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Array.from({ length: Math.max(1, Math.min(12, maxInstallments)) }, (_, index) => (
									<SelectItem key={index} value={String(index + 1)}>
										{index + 1}x
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<p className="text-sm">Recebendo em {period}: valor integral, com antecipação já incluída no percentual.</p>
					</div>
				) : (
					<p className="text-sm">Disponibilidade no gateway: {quote.settlement}.</p>
				)}
				{pending ? (
					<p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-950">
						Simulação do meio solicitado: aguarda habilitação e ainda não está disponível no checkout.
					</p>
				) : null}
				<dl className="divide-y text-sm">
					{rows.map(([label, value]) => (
						<div key={label} className="flex items-start justify-between gap-6 py-3">
							<dt>{label}</dt>
							<dd className="shrink-0 font-medium tabular-nums">{value}</dd>
						</div>
					))}
				</dl>
				<div className="rounded-xl bg-violet-50 p-4 text-violet-950">
					<p className="text-sm font-medium">Recebimento líquido estimado</p>
					<p className="mt-1 text-2xl font-semibold">{formatCurrency(fees.organizerReceives)}</p>
					<p className="mt-2 text-xs">
						Preço base − gateway{passed ? '' : ' − taxa da plataforma'}.{' '}
						{passed
							? 'A conveniência já cobre a taxa da plataforma; ela não é descontada novamente do preço base.'
							: 'A conveniência não é adicionada ao preço do comprador.'}
					</p>
				</div>
				<p className="text-xs text-muted-foreground">
					As linhas acima detalham o mesmo cálculo: percentual e mínimo não são somados. A tarifa fixa do gateway é por
					transação; compras com vários ingressos compartilham essa parcela. Valores efetivos são confirmados na
					liquidação do pagamento.
				</p>
				{feeTable && (
					<div className="space-y-2 rounded-lg bg-muted p-4 text-xs text-muted-foreground">
						<p className="font-semibold">Custos separados do ingresso</p>
						<p>
							Saques Pix: {formatCurrency(gateway.payout_fee_fixed)} por saque nos primeiros{' '}
							{gateway.payout_pix_monthly_limit} do mês; {formatCurrency(gateway.payout_pix_excess_fee)} a partir do{' '}
							{gateway.payout_pix_monthly_limit + 1}º saque. A faixa é contabilizada na conta do gateway.
						</p>
						<p>
							TED: {formatCurrency(gateway.ted_fee_fixed)} por transferência. Valor mínimo de repasse:{' '}
							{formatCurrency(table.minimum_payout)}; o mínimo não é uma taxa.
						</p>
						<p>
							Mensalidade do gateway: {formatCurrency(gateway.monthly_fee)}. Gerar QR Code Pix:{' '}
							{formatCurrency(gateway.pix_qr_fee)}. Gerar boleto: {formatCurrency(gateway.boleto_issue_fee)}. Esses
							custos não estão somados ao ingresso desta simulação.
						</p>
						<p>
							O boleto pago pelo Pix cobra somente a tarifa do Pix. O repasse para sua conta depende da disponibilidade
							do saldo e da aprovação dos dados de recebimento.
						</p>
					</div>
				)}
				{isFallback && (
					<p role="status" className="text-xs text-amber-700">
						Não foi possível carregar as taxas atuais. Esta simulação usa valores padrão e será recalculada ao salvar.
					</p>
				)}
			</DialogContent>
		</Dialog>
	);
}
