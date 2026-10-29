'use client';

import { CreditCard, Info, QrCode } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import InstallmentOptions from '@/components/events/InstallmentOptions';
import type { PaymentMethod } from '../api/usePaymentMethods';

export interface InstallmentTicketConfig {
	allow_installments?: boolean | null;
	max_installments?: number | null;
	min_amount_for_installments?: number | null;
}

interface PaymentMethodSectionProps {
	availableMethods: PaymentMethod[];
	disabled?: boolean;
	method: PaymentMethod;
	onInstallmentChange: (installments: number | null) => void;
	onMethodChange: (method: PaymentMethod) => void;
	selectedInstallments: number | null;
	ticket?: InstallmentTicketConfig | null;
	totalAmount: number;
}

/**
 * Última etapa da compra. A pessoa escolhe entre Pix e cartão e o restante da
 * seção muda: no Pix, à vista ou em parcelas via Pix quando o ingresso permite;
 * no cartão, o parcelamento acontece na página segura do provedor. O cartão só
 * fica habilitado quando a loja aceita, porque pedir um método desabilitado
 * derruba o checkout inteiro.
 */
export function PaymentMethodSection({
	availableMethods,
	disabled = false,
	method,
	onInstallmentChange,
	onMethodChange,
	selectedInstallments,
	ticket,
	totalAmount,
}: PaymentMethodSectionProps) {
	const cardAvailable = availableMethods.includes('CARD');
	const maxCardInstallments = ticket?.allow_installments ? Math.min(12, Number(ticket.max_installments ?? 1)) : 1;

	return (
		<div className="space-y-5">
			<div>
				<h3 className="text-lg font-semibold">Forma de pagamento</h3>
				<p className="text-sm text-muted-foreground">Escolha como prefere pagar.</p>
			</div>

			<RadioGroup
				value={method}
				onValueChange={(value) => onMethodChange(value as PaymentMethod)}
				disabled={disabled}
				aria-label="Forma de pagamento"
			>
				<div className="flex items-start gap-3 rounded-lg border p-4 transition-colors has-[[data-state=checked]]:border-primary">
					<RadioGroupItem value="PIX" id="payment-method-pix" className="mt-1" />
					<Label htmlFor="payment-method-pix" className="flex flex-1 cursor-pointer items-start gap-3">
						<QrCode className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						<span className="space-y-1">
							<span className="block font-semibold">Pix</span>
							<span className="block text-sm text-muted-foreground">
								Aprovação em segundos. À vista ou em parcelas via Pix, quando o ingresso permite.
							</span>
						</span>
					</Label>
				</div>

				<div className="flex items-start gap-3 rounded-lg border p-4 transition-colors has-[[data-state=checked]]:border-primary has-[[data-disabled]]:opacity-60">
					<RadioGroupItem value="CARD" id="payment-method-card" className="mt-1" disabled={!cardAvailable} />
					<Label
						htmlFor="payment-method-card"
						className={`flex flex-1 items-start gap-3 ${cardAvailable ? 'cursor-pointer' : 'cursor-not-allowed'}`}
					>
						<CreditCard className="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
						<span className="space-y-1">
							<span className="block font-semibold">Cartão de crédito</span>
							<span className="block text-sm text-muted-foreground">
								{cardAvailable
									? maxCardInstallments > 1
										? `Parcele em até ${maxCardInstallments}x no ambiente seguro de pagamento.`
										: 'Pagamento à vista no ambiente seguro de pagamento.'
									: 'Cartão ainda não habilitado nesta loja. Pague com Pix.'}
							</span>
						</span>
					</Label>
				</div>
			</RadioGroup>

			{method === 'PIX' && ticket ? (
				<InstallmentOptions
					totalAmount={totalAmount}
					maxInstallments={ticket.max_installments || 4}
					minAmountForInstallments={ticket.min_amount_for_installments || 50}
					allowInstallments={ticket.allow_installments || false}
					selectedInstallments={selectedInstallments}
					onInstallmentChange={onInstallmentChange}
				/>
			) : null}

			{method === 'CARD' ? (
				<Alert>
					<Info className="size-4" />
					<AlertDescription className="text-sm">
						Você informa os dados do cartão no ambiente seguro de pagamento
						{maxCardInstallments > 1 ? ` e escolhe lá o número de parcelas, até ${maxCardInstallments}x` : ''}.
					</AlertDescription>
				</Alert>
			) : null}
		</div>
	);
}
