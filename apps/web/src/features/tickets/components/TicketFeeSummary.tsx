'use client';

import { TicketFeeDetails } from './TicketFeeDetails';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Eye, Wallet } from 'lucide-react';
import type { OrganizerPaymentSettingsResponse } from '@events-manager/contracts';
import { memo, useMemo } from 'react';
import { calculateFees, formatCurrency, type FeeConfig, type PublicFeeTable } from '@/lib/fees';
import type { TicketServiceFeeType } from '../types';

interface TicketFeeSummaryProps {
	price: number;
	serviceFeeType: TicketServiceFeeType;
	feeConfig: FeeConfig;
	feeTable?: PublicFeeTable;
	isFallback: boolean;
	paymentSettings?: OrganizerPaymentSettingsResponse;
	maxInstallments?: number;
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
	feeTable,
	paymentSettings,
	maxInstallments,
}: TicketFeeSummaryProps) {
	const fees = useMemo(
		() => (price > 0 ? calculateFees(price, serviceFeeType, feeConfig) : null),
		[feeConfig, price, serviceFeeType],
	);

	if (!fees) {
		return (
			<p className="rounded-xl border border-dashed border-[#743DF5]/25 bg-[#F3EEFF] px-4 py-3 text-xs text-[#625674]">
				Informe um valor para ver quanto o comprador paga e quanto você recebe.
			</p>
		);
	}

	if (serviceFeeType === 'absorbed' && fees.platformFee > price)
		return (
			<Alert variant="destructive" role="alert" className="border text-sm">
				<AlertDescription>
					O preço não cobre a taxa mínima. Aumente o preço ou repasse a taxa ao comprador.
				</AlertDescription>
			</Alert>
		);

	return (
		<Card className="overflow-hidden rounded-2xl border-[#743DF5]/25 bg-[#F3EEFF] text-[#231A33] shadow-sm">
			<div className="space-y-4 border-t-4 border-[#743DF5] p-4">
				<div className="flex items-center gap-3">
					<div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#FFD09D] text-[#231A33]">
						<Eye className="size-4" aria-hidden="true" />
					</div>
					<div>
						<h3 className="text-sm font-semibold">Prévia por ingresso</h3>
						<p className="mt-0.5 text-xs text-[#625674]">Confira os valores antes de salvar.</p>
					</div>
				</div>

				<div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,10rem),1fr))] gap-3">
					<div className="rounded-xl border border-[#743DF5]/10 bg-white p-4">
						<p className="text-xs font-medium text-[#625674]">Comprador paga</p>
						<p className="mt-1 break-words text-2xl font-bold tabular-nums tracking-tight">
							{formatCurrency(fees.buyerPrice)}
						</p>
					</div>
					<div className="rounded-xl bg-[#743DF5] p-4 text-white">
						<p className="flex items-center gap-1.5 text-xs font-medium">
							<Wallet className="size-3.5 shrink-0 text-[#FFD09D]" aria-hidden="true" />
							Você recebe
						</p>
						<p className="mt-1 break-words text-2xl font-bold tabular-nums tracking-tight">
							{formatCurrency(fees.organizerReceives)}
						</p>
					</div>
				</div>

				{paymentSettings ? (
					<p className="text-xs text-[#625674]">
						Estimativa para{' '}
						{paymentSettings.settings.accepted_payment_methods.includes('PIX')
							? 'Pix'
							: paymentSettings.settings.accepted_payment_methods[0] === 'CARD'
								? `crédito em 1x, ${paymentSettings.settings.credit_card_settlement_period}`
								: paymentSettings.settings.accepted_payment_methods[0] === 'BOLETO'
									? 'boleto'
									: 'débito'}
						.
					</p>
				) : null}
			</div>
			<div className="border-t border-[#743DF5]/10 bg-white/75 p-4">
				<dl className="space-y-2 text-xs text-[#625674]">
					<div className="flex justify-between gap-4">
						<dt>Taxa de conveniência</dt>
						<dd className="shrink-0 font-medium tabular-nums text-[#231A33]">{formatCurrency(fees.convenienceFee)}</dd>
					</div>
					<div className="flex justify-between gap-4">
						<dt>Tarifa estimada do gateway</dt>
						<dd className="shrink-0 font-medium tabular-nums text-[#231A33]">{formatCurrency(fees.providerFee)}</dd>
					</div>
				</dl>

				<p className="mt-3 text-[11px] leading-4 text-[#625674]">
					{isFallback
						? 'Não foi possível carregar as taxas atuais; a estimativa usa os valores padrão. O valor final é recalculado ao salvar.'
						: 'Estimativa. A tarifa efetiva do gateway é confirmada na liquidação do pagamento.'}
				</p>
				<TicketFeeDetails
					paymentSettings={paymentSettings}
					maxInstallments={maxInstallments}
					price={price}
					serviceFeeType={serviceFeeType}
					feeConfig={feeConfig}
					feeTable={feeTable}
					isFallback={isFallback}
				/>
			</div>
		</Card>
	);
});
