'use client';

import { ArrowRight, Wallet } from 'lucide-react';
import { memo, useMemo } from 'react';
import { calculateFees, formatCurrency, type FeeConfig } from '@/lib/fees';
import type { TicketServiceFeeType } from '../types';

interface TicketFeeSummaryProps {
	price: number;
	serviceFeeType: TicketServiceFeeType;
	feeConfig: FeeConfig;
	isFallback: boolean;
}

/**
 * Isolated and memoised on purpose: fee maths runs on every keystroke in the
 * price field, and keeping it here stops the rest of the sheet from re-rendering
 * with it.
 */
export const TicketFeeSummary = memo(function TicketFeeSummary({
	price,
	serviceFeeType,
	feeConfig,
	isFallback,
}: TicketFeeSummaryProps) {
	const fees = useMemo(
		() => (price > 0 ? calculateFees(price, serviceFeeType, feeConfig) : null),
		[feeConfig, price, serviceFeeType],
	);

	if (!fees) {
		return (
			<p className="rounded-lg border border-dashed bg-muted/40 px-4 py-3 text-xs text-muted-foreground">
				Informe um valor para ver quanto o comprador paga e quanto você recebe.
			</p>
		);
	}

	return (
		<div className="rounded-lg border bg-muted/40 p-4">
			<div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
				<div>
					<p className="text-xs text-muted-foreground">Comprador paga</p>
					<p className="text-lg font-bold tabular-nums text-foreground">{formatCurrency(fees.buyerPrice)}</p>
				</div>
				<ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
				<div>
					<p className="text-xs text-muted-foreground">Você recebe</p>
					<p className="text-lg font-bold tabular-nums text-emerald-600">{formatCurrency(fees.organizerReceives)}</p>
				</div>
			</div>

			<dl className="mt-3 space-y-1 border-t pt-3 text-xs text-muted-foreground">
				<div className="flex justify-between gap-4">
					<dt>Taxa de conveniência</dt>
					<dd className="tabular-nums">{formatCurrency(fees.convenienceFee)}</dd>
				</div>
				<div className="flex justify-between gap-4">
					<dt>Tarifa estimada do gateway</dt>
					<dd className="tabular-nums">{formatCurrency(fees.providerFee)}</dd>
				</div>
			</dl>

			<p className="mt-3 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
				<Wallet className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
				{isFallback
					? 'Não foi possível carregar as taxas atuais; a estimativa usa os valores padrão. O valor final é recalculado ao salvar.'
					: 'Estimativa. A tarifa efetiva do gateway é confirmada na liquidação do pagamento.'}
			</p>
		</div>
	);
});
