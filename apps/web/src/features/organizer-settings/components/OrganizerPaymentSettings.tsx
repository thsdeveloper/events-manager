'use client';
import { Can } from '@/components/auth/PermissionsProvider';

import {
	CARD_SETTLEMENT_PERIODS,
	organizerPaymentSettingsSchema,
	readGatewayFees,
	type OrganizerPaymentSettings as Preferences,
	type AcceptedPaymentMethod,
	type OrganizerPaymentSettingsResponse,
} from '@events-manager/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { CreditCard, QrCode, Barcode, Wallet } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { useOrganizerPaymentSettings, ORGANIZER_PAYMENT_SETTINGS_KEY } from '@/hooks/useOrganizerPaymentSettings';
import { usePublicFees } from '@/hooks/usePublicFees';
import { useToast } from '@/hooks/use-toast';
import { describeProblem } from '@/lib/problem';
import { formatCurrency } from '@/lib/fees';

const methods = [
	{ value: 'PIX', label: 'Pix', Icon: QrCode },
	{ value: 'CARD', label: 'Cartão de crédito', Icon: CreditCard },
	{ value: 'BOLETO', label: 'Boleto', Icon: Barcode },
	{ value: 'DEBIT', label: 'Cartão de débito', Icon: Wallet },
] as const;
const periodDescriptions = {
	'D+1': 'Valor disponível no próximo dia útil após a venda aprovada.',
	'D+7': 'Valor disponível em 7 dias após a venda aprovada.',
	'D+15': 'Valor disponível em 15 dias após a venda aprovada.',
	'D+30': 'Valor disponível em 30 dias após a venda aprovada. Menor taxa na tabela padrão.',
};

export function OrganizerPaymentSettings() {
	const query = useOrganizerPaymentSettings();
	const { fees, isFallback } = usePublicFees();
	const [draft, setDraft] = useState<Preferences | null>(null);
	const [saving, setSaving] = useState(false);
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const gateway = readGatewayFees({ ...fees });
	const values = draft ?? query.data?.settings;
	const percent = (rate: number) => `${rate.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}%`;
	function toggle(method: AcceptedPaymentMethod, checked: boolean) {
		if (!values) return;
		setDraft({
			...values,
			accepted_payment_methods: checked
				? [...values.accepted_payment_methods, method]
				: values.accepted_payment_methods.filter((value) => value !== method),
		});
	}
	async function save() {
		const parsed = organizerPaymentSettingsSchema.safeParse(values);
		if (!parsed.success) {
			toast({
				title: 'Revise as formas de pagamento',
				description: parsed.error.issues[0].message,
				variant: 'destructive',
			});

			return;
		}
		setSaving(true);
		try {
			const response = await fetch('/api/organizer/payment-settings', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed.data),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(describeProblem(body));
			queryClient.setQueryData<OrganizerPaymentSettingsResponse>(ORGANIZER_PAYMENT_SETTINGS_KEY, body);
			setDraft(null);
			await queryClient.invalidateQueries({ queryKey: ['public', 'payment-methods'] });
			toast({
				title: 'Formas de pagamento salvas',
				description: body.pending_methods.length
					? 'Confira abaixo os meios que aguardam habilitação.'
					: 'As preferências serão usadas nas próximas compras.',
			});
		} catch (error) {
			toast({
				title: 'Não foi possível salvar',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setSaving(false);
		}
	}
	const hints: Record<AcceptedPaymentMethod, string> = {
		PIX: `${formatCurrency(gateway.pix_fee_fixed)} por transação paga. Disponível na hora.`,
		BOLETO: `${formatCurrency(gateway.boleto_fee_fixed)} por boleto pago, em até 3 dias úteis. Se pago pelo Pix: ${formatCurrency(gateway.pix_fee_fixed)}, na hora.`,
		CARD: `De 1x a 12x, conforme o ingresso. Escolha abaixo o prazo de recebimento e confira as taxas.`,
		DEBIT: `${percent(gateway.debit_fee_percentage)} + ${formatCurrency(gateway.debit_fee_fixed)} por transação. D+1. Habilitação pendente: o checkout atual ainda não oferece débito separado.`,
	};

	return (
		<Card id="pagamentos">
			<CardHeader>
				<CardTitle>Formas de pagamento</CardTitle>
				<CardDescription>
					Escolha como os participantes podem pagar em todos os eventos desta organização. Apenas Pix vem habilitado por
					padrão.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-5">
				{query.isPending ? (
					<p role="status">Carregando formas de pagamento…</p>
				) : query.isError || !values ? (
					<div role="alert">
						<p>Não foi possível carregar as formas de pagamento.</p>
						<Button variant="outline" onClick={() => query.refetch()}>
							Tentar novamente
						</Button>
					</div>
				) : (
					<>
						<div className="grid gap-3 md:grid-cols-2">
							{methods.map(({ value, label, Icon }) => (
								<div
									key={value}
									className="flex items-start gap-3 rounded-lg border p-4 has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
								>
									<Checkbox
										id={`accept-${value}`}
										aria-label={label}
										checked={values.accepted_payment_methods.includes(value)}
										onCheckedChange={(checked) => toggle(value, checked === true)}
										disabled={saving}
										className="mt-1"
									/>
									<Label htmlFor={`accept-${value}`} className="flex-1 cursor-pointer space-y-2">
										<span className="flex items-center gap-2 font-semibold">
											<Icon className="size-4" />
											{label}
										</span>
										<span className="block text-sm font-normal leading-6 text-muted-foreground">{hints[value]}</span>
									</Label>
								</div>
							))}
						</div>
						{values.accepted_payment_methods.includes('CARD') ? (
							<div className="space-y-4 rounded-lg bg-muted/40 p-4">
								<div>
									<h3 className="font-semibold">Quando você quer receber as vendas no crédito?</h3>
									<p className="mt-1 text-sm text-muted-foreground">
										D é o dia da venda aprovada; o número indica o prazo para disponibilizar o valor integral, mesmo em
										compras parceladas. Quanto antes você recebe, maior a tarifa. A antecipação já está incluída, sem
										somar outra taxa.
									</p>
								</div>
								<RadioGroup
									value={values.credit_card_settlement_period ?? ''}
									onValueChange={(period) =>
										setDraft({
											...values,
											credit_card_settlement_period: period as Preferences['credit_card_settlement_period'],
										})
									}
									aria-label="Prazo de recebimento do cartão"
									className="grid gap-3 lg:grid-cols-2"
									disabled={saving}
								>
									{CARD_SETTLEMENT_PERIODS.map((period) => (
										<Label
											htmlFor={`settlement-${period}`}
											key={period}
											className="flex cursor-pointer items-start gap-3 rounded-lg border bg-background p-4 has-[[data-state=checked]]:border-primary"
										>
											<RadioGroupItem
												id={`settlement-${period}`}
												value={period}
												aria-label={`Recebendo em ${period}`}
												className="mt-1"
											/>
											<span className="space-y-2">
												<span className="block font-semibold">Recebendo em {period}</span>
												<span className="block text-sm font-normal text-muted-foreground">
													{periodDescriptions[period]}
												</span>
												<span className="block text-sm">
													1x: {percent(gateway.card_rates[period][0])} · 12x: {percent(gateway.card_rates[period][11])}
													<br />+ {formatCurrency(gateway.card_fee_fixed)} por transação
												</span>
											</span>
										</Label>
									))}
								</RadioGroup>
								<p className="text-sm text-muted-foreground">
									Sua escolha registra o prazo solicitado. O crédito só será oferecido aos participantes após a
									habilitação e a compatibilidade com o prazo da conta de pagamentos. Os outros meios disponíveis
									continuam funcionando.
								</p>
							</div>
						) : null}
						{query.data?.pending_methods.map(({ method, reason }) => (
							<p
								key={method}
								role="status"
								className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"
							>
								{method === 'CARD' && reason === 'settlement'
									? `Crédito pendente: o prazo solicitado (${query.data?.settings.credit_card_settlement_period}) aguarda compatibilidade com a conta de pagamentos. Os demais meios disponíveis continuam ativos.`
									: `${methods.find((item) => item.value === method)?.label} pendente: ${reason === 'integration' ? 'aguardando disponibilidade no checkout.' : 'aguardando habilitação na conta de pagamentos.'}`}
							</p>
						))}
						<p className="text-sm text-muted-foreground">
							<Badge variant="secondary" className="mr-2">
								Recebimento e repasse
							</Badge>
							Esses prazos indicam quando o pagamento fica disponível no gateway. O repasse para sua conta também
							depende do saldo disponível e da aprovação dos seus dados em Recebimento e verificação.
						</p>
						{isFallback ? (
							<p role="status" className="text-sm text-muted-foreground">
								As taxas atuais não puderam ser carregadas. Os valores exibidos são os padrões de referência.
							</p>
						) : null}
						<Can permission={'payments.configure'}>
							<Button onClick={save} loading={saving}>
								Salvar formas de pagamento
							</Button>
						</Can>
					</>
				)}
			</CardContent>
		</Card>
	);
}
