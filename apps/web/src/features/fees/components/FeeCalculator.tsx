'use client';

import { ArrowRight, Info } from 'lucide-react';
import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	calculateFeesForMethod,
	formatCurrency,
	PAYMENT_METHODS,
	type PaymentMethod,
	type PublicFeeTable,
} from '@/lib/fees';
import { cn } from '@/lib/utils';
import { usePublicFees } from '../api/usePublicFees';

type FeeMode = 'passed_to_buyer' | 'absorbed';

const percent = (value: number) => `${value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}%`;

function feeRows(fees: PublicFeeTable) {
	return [
		{ label: 'Taxa de serviço da plataforma', value: `${percent(fees.platform_fee_percentage)} do ingresso` },
		{ label: 'PIX', value: `${formatCurrency(fees.pix_fee_fixed)} por transação` },
		{
			label: 'Cartão à vista',
			value: `${percent(fees.card_fee_percentage)} + ${formatCurrency(fees.card_fee_fixed)} por transação`,
		},
		{
			label: 'Cartão em 2 a 6 vezes',
			value: `${percent(fees.card_installment_2_6_percentage)} + ${formatCurrency(fees.card_fee_fixed)} por transação`,
		},
		{
			label: 'Cartão em 7 a 12 vezes',
			value: `${percent(fees.card_installment_7_12_percentage)} + ${formatCurrency(fees.card_fee_fixed)} por transação`,
		},
		{ label: 'Boleto', value: `${formatCurrency(fees.boleto_fee_fixed)} por transação` },
		{ label: 'Repasse para sua chave PIX', value: `${formatCurrency(fees.payout_fee_fixed)} por repasse` },
		{ label: 'Valor mínimo de repasse', value: formatCurrency(fees.minimum_payout) },
	];
}

function optionClass(selected: boolean) {
	return cn(
		'flex cursor-pointer items-start gap-3 rounded-lg border px-4 py-3 text-sm transition-colors',
		selected
			? 'border-violet-400 bg-violet-50 text-violet-950 dark:border-violet-600 dark:bg-violet-950/40 dark:text-violet-50'
			: 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-200 dark:hover:bg-slate-800/60',
	);
}

/**
 * Calculadora completa de taxas: preço, quantidade, quem paga a taxa de
 * serviço e a forma de pagamento. Mostra quanto o comprador paga, quanto o
 * organizador recebe e a tabela vigente, tudo com as mesmas contas do
 * formulário de ingressos.
 */
export function FeeCalculator() {
	const id = useId();
	const [price, setPrice] = useState('100');
	const [quantity, setQuantity] = useState('1');
	const [mode, setMode] = useState<FeeMode>('passed_to_buyer');
	const [method, setMethod] = useState<PaymentMethod>('card');
	const { fees, isFallback } = usePublicFees();

	const amount = Number(price.replace(',', '.'));
	const count = Math.max(1, Math.floor(Number(quantity) || 1));
	const result = Number.isFinite(amount) && amount > 0 ? calculateFeesForMethod(amount, mode, method, fees) : null;

	return (
		<div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
			<div className="space-y-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
				<div className="grid gap-5 sm:grid-cols-2">
					<div className="space-y-2">
						<Label htmlFor={`${id}-price`}>Valor do ingresso</Label>
						<div className="relative">
							<span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-slate-500">
								R$
							</span>
							<Input
								id={`${id}-price`}
								inputMode="decimal"
								value={price}
								onChange={(event) => setPrice(event.target.value.replace(/[^\d.,]/g, ''))}
								className="h-11 pl-10 tabular-nums"
							/>
						</div>
					</div>
					<div className="space-y-2">
						<Label htmlFor={`${id}-quantity`}>Quantidade de ingressos</Label>
						<Input
							id={`${id}-quantity`}
							type="number"
							min={1}
							inputMode="numeric"
							value={quantity}
							onChange={(event) => setQuantity(event.target.value)}
							className="h-11 tabular-nums"
						/>
					</div>
				</div>

				<fieldset className="space-y-2">
					<legend className="text-sm font-medium leading-none">Quem paga a taxa de serviço</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						{(
							[
								{
									value: 'passed_to_buyer',
									label: 'Repasso ao comprador',
									hint: 'O preço final sobe e você recebe o valor cheio.',
								},
								{ value: 'absorbed', label: 'Eu absorvo a taxa', hint: 'O comprador paga o preço anunciado.' },
							] as const
						).map((option) => (
							<label key={option.value} className={optionClass(mode === option.value)}>
								<input
									type="radio"
									name={`${id}-mode`}
									value={option.value}
									checked={mode === option.value}
									onChange={() => setMode(option.value)}
									className="mt-0.5 size-4 accent-violet-600"
								/>
								<span>
									<span className="block font-medium">{option.label}</span>
									<span className="block text-xs text-slate-500 dark:text-slate-400">{option.hint}</span>
								</span>
							</label>
						))}
					</div>
				</fieldset>

				<fieldset className="space-y-2">
					<legend className="text-sm font-medium leading-none">Forma de pagamento do comprador</legend>
					<div className="grid gap-2 sm:grid-cols-2">
						{PAYMENT_METHODS.map((option) => (
							<label key={option.value} className={optionClass(method === option.value)}>
								<input
									type="radio"
									name={`${id}-method`}
									value={option.value}
									checked={method === option.value}
									onChange={() => setMethod(option.value)}
									className="mt-0.5 size-4 accent-violet-600"
								/>
								<span>
									<span className="block font-medium">{option.label}</span>
									<span className="block text-xs text-slate-500 dark:text-slate-400">{option.hint}</span>
								</span>
							</label>
						))}
					</div>
				</fieldset>
			</div>

			<div className="space-y-4">
				<div className="rounded-lg border border-violet-200 bg-violet-50 p-6 dark:border-violet-900 dark:bg-violet-950/30">
					<div className="flex flex-wrap items-center gap-x-6 gap-y-3">
						<div>
							<p className="text-xs text-slate-600 dark:text-slate-300">Comprador paga</p>
							<p
								data-testid="calculator-buyer-pays"
								className="text-3xl font-semibold tabular-nums text-slate-950 dark:text-white"
							>
								{result ? formatCurrency(result.buyerPrice) : '—'}
							</p>
						</div>
						<ArrowRight className="hidden size-5 text-slate-400 sm:block" aria-hidden="true" />
						<div>
							<p className="text-xs text-slate-600 dark:text-slate-300">Você recebe por ingresso</p>
							<p
								data-testid="calculator-organizer-receives"
								className="text-3xl font-semibold tabular-nums text-emerald-700 dark:text-emerald-400"
							>
								{result ? formatCurrency(result.organizerReceives) : '—'}
							</p>
						</div>
					</div>
					{result ? (
						<dl className="mt-5 space-y-1.5 border-t border-violet-200/70 pt-4 text-sm text-slate-700 dark:border-violet-900 dark:text-slate-200">
							<div className="flex justify-between gap-4">
								<dt>Preço anunciado</dt>
								<dd className="tabular-nums">{formatCurrency(result.ticketPrice)}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt>Taxa de serviço da plataforma</dt>
								<dd className="tabular-nums">{formatCurrency(result.platformFee)}</dd>
							</div>
							<div className="flex justify-between gap-4">
								<dt>Tarifa estimada do gateway</dt>
								<dd className="tabular-nums">{formatCurrency(result.providerFee)}</dd>
							</div>
							<div className="flex justify-between gap-4 font-semibold text-slate-950 dark:text-white">
								<dt>
									Você recebe por {count} {count === 1 ? 'ingresso' : 'ingressos'}
								</dt>
								<dd data-testid="calculator-total-receives" className="tabular-nums">
									{formatCurrency(result.organizerReceives * count)}
								</dd>
							</div>
						</dl>
					) : (
						<p className="mt-4 text-sm text-slate-600 dark:text-slate-300">Informe um valor maior que zero.</p>
					)}
					<p className="mt-4 flex gap-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
						<Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
						{isFallback
							? 'Estimativa com as taxas padrão publicadas; a tabela vigente aparece no painel.'
							: 'Estimativa com as taxas atuais da plataforma. A tarifa efetiva do gateway é confirmada na liquidação.'}
					</p>
				</div>

				<div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
					<table className="w-full text-sm" aria-label="Tabela de taxas da plataforma">
						<caption className="border-b border-slate-100 px-5 py-3 text-left font-semibold text-slate-950 dark:border-slate-800 dark:text-white">
							Tabela de taxas
						</caption>
						<tbody>
							{feeRows(fees).map((row) => (
								<tr key={row.label} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
									<th scope="row" className="px-5 py-2.5 text-left font-normal text-slate-600 dark:text-slate-300">
										{row.label}
									</th>
									<td className="px-5 py-2.5 text-right tabular-nums text-slate-950 dark:text-white">{row.value}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
