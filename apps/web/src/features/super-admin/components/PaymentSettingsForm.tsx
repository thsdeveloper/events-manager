'use client';

import {
	CARD_SETTLEMENT_PERIODS,
	paymentSettingsSchema,
	readGatewayFees,
	type CardFeeRates,
	type CardSettlementPeriod,
} from '@events-manager/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell, TableCaption } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CurrencyInput } from '@/components/ui/currency-input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { describeProblem } from '@/lib/problem';

const platformFields = [
	{
		key: 'platform_fee_percentage',
		label: 'Taxa da plataforma (%)',
		helper: 'Percentual sobre o preço base de cada ingresso pago.',
		kind: 'percent',
	},
	{
		key: 'platform_fee_minimum',
		label: 'Taxa mínima por ingresso',
		helper: 'Aplica o maior valor entre o percentual e este mínimo. Ingressos gratuitos não pagam essa taxa.',
	},
	{
		key: 'minimum_payout',
		label: 'Valor mínimo para solicitar repasse',
		helper: 'Limite operacional; não é uma cobrança adicional.',
	},
] as const;
const receivingFields = [
	{ key: 'pix_fee_fixed', label: 'Pix recebido', helper: 'Por transação paga. Disponível na hora.' },
	{ key: 'boleto_fee_fixed', label: 'Boleto pago', helper: 'Por boleto compensado. Disponível em até 3 dias úteis.' },
	{
		key: 'card_fee_fixed',
		label: 'Tarifa fixa do cartão de crédito',
		helper: 'Somada ao percentual da tabela, uma vez por transação, não por parcela.',
	},
	{
		key: 'debit_fee_percentage',
		label: 'Cartão de débito (%)',
		helper: 'Percentual sobre o total da transação. Recebimento em D+1.',
		kind: 'percent',
	},
	{
		key: 'debit_fee_fixed',
		label: 'Tarifa fixa do cartão de débito',
		helper: 'Somada ao percentual do débito por transação.',
	},
] as const;
const withdrawalFields = [
	{
		key: 'payout_fee_fixed',
		label: 'Saque Pix — primeira faixa',
		helper: 'Tarifa por saque dentro da quantidade mensal abaixo.',
	},
	{
		key: 'payout_pix_monthly_limit',
		label: 'Quantidade de saques na primeira faixa',
		helper: 'Com 20, a segunda tarifa começa no 21º saque do mês.',
		kind: 'count',
	},
	{
		key: 'payout_pix_excess_fee',
		label: 'Saque Pix — após a primeira faixa',
		helper: 'Tarifa por saque após atingir o limite mensal.',
	},
	{
		key: 'ted_fee_fixed',
		label: 'Transferência TED',
		helper: 'Tarifa de TED no gateway. Transferências manuais seguem o custo da instituição utilizada.',
	},
] as const;
const otherFields = [
	{
		key: 'monthly_fee',
		label: 'Mensalidade do gateway',
		helper: 'Tabela padrão: sem mensalidade. Não é descontada por ingresso.',
	},
	{ key: 'pix_qr_fee', label: 'Gerar QR Code Pix', helper: 'Tabela padrão: grátis. Gerar não é o mesmo que receber.' },
	{
		key: 'boleto_issue_fee',
		label: 'Gerar boleto',
		helper: 'Tabela padrão: grátis. A tarifa de recebimento só incide no boleto pago.',
	},
] as const;
type FeeField = { key: string; label: string; helper: string; kind?: string };

export function PaymentSettingsForm({
	initialSettings,
	runtimeProvider,
}: {
	initialSettings: Record<string, unknown>;
	runtimeProvider: string;
}) {
	const [settings, setSettings] = useState<Record<string, unknown>>(() => ({
		...initialSettings,
		...readGatewayFees(initialSettings),
		gateway_card_settlement_period: initialSettings.gateway_card_settlement_period ?? 'D+1',
	}));
	const [saving, setSaving] = useState(false);
	const queryClient = useQueryClient();
	const { toast } = useToast();
	const update = (key: string, value: unknown) => setSettings((current) => ({ ...current, [key]: value }));
	const rates = settings.card_rates as CardFeeRates;

	async function save(event: React.FormEvent) {
		event.preventDefault();
		const input = Object.fromEntries(
			[...platformFields, ...receivingFields, ...withdrawalFields, ...otherFields].map(({ key }) => [
				key,
				settings[key] ?? 0,
			]),
		);
		const parsed = paymentSettingsSchema.safeParse({
			...input,
			card_rates: rates,
			payouts_enabled: Boolean(settings.payouts_enabled),
			convenience_fee_calculation_method: settings.convenience_fee_calculation_method ?? 'buyer_pays',
			gateway_card_settlement_period: settings.gateway_card_settlement_period,
		});
		if (!parsed.success) {
			toast({ title: 'Revise as taxas', description: parsed.error.issues[0].message, variant: 'destructive' });

			return;
		}
		setSaving(true);
		try {
			const response = await fetch('/api/super-admin/settings/payments', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(parsed.data),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(describeProblem(body));
			setSettings({ ...body.settings, ...readGatewayFees(body.settings) });
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ['public-fees'] }),
				queryClient.invalidateQueries({ queryKey: ['organizer-payment-settings'] }),
				queryClient.invalidateQueries({ queryKey: ['public', 'payment-methods'] }),
			]);
			toast({ title: 'Taxas atualizadas', description: 'Configurações salvas e registradas na auditoria.' });
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
	function fields(items: readonly FeeField[]) {
		return (
			<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
				{items.map((field) => (
					<div key={field.key} className="space-y-2">
						<Label htmlFor={field.key}>{field.label}</Label>
						{field.kind ? (
							<Input
								id={field.key}
								type="number"
								inputMode="decimal"
								min={0}
								max={field.kind === 'percent' ? 100 : 1000000}
								step={field.kind === 'count' ? 1 : 0.01}
								value={Number(settings[field.key] ?? 0)}
								onChange={(event) => update(field.key, Number(event.target.value))}
							/>
						) : (
							<CurrencyInput
								id={field.key}
								value={Number(settings[field.key] ?? 0)}
								onValueChange={(value) => update(field.key, value)}
							/>
						)}
						<p className="text-xs leading-5 text-muted-foreground">{field.helper}</p>
					</div>
				))}
			</div>
		);
	}

	return (
		<form onSubmit={save} className="space-y-6">
			<Card className="flex flex-wrap items-center justify-between gap-4 p-5">
				<div>
					<p className="font-semibold">{runtimeProvider === 'mock' ? 'Simulação local ativa' : 'AbacatePay ativo'}</p>
					<p className="text-sm text-muted-foreground">
						As taxas parametrizadas alimentam as estimativas. O financeiro concilia a tarifa efetiva informada pelo
						gateway.
					</p>
				</div>
				<Label className="flex items-center gap-3">
					<Switch
						checked={Boolean(settings.payouts_enabled)}
						onCheckedChange={(checked) => update('payouts_enabled', checked)}
						aria-label="Habilitar repasses reais"
					/>
					Repasses reais
				</Label>
			</Card>
			<fieldset className="space-y-5 rounded-xl border bg-card p-5">
				<legend className="px-2 text-lg font-semibold">Taxas da plataforma</legend>
				<p className="text-sm text-muted-foreground">
					Remuneração da Flouvi pela venda dos ingressos. O organizador escolhe no ingresso se absorve essa taxa ou a
					repassa ao comprador.
				</p>
				{fields(platformFields)}
			</fieldset>
			<fieldset className="min-w-0 space-y-6 rounded-xl border bg-card p-5">
				<legend className="px-2 text-lg font-semibold">Taxas do gateway — AbacatePay</legend>
				<div className="space-y-4">
					<h3 className="font-semibold">Receber pagamentos</h3>
					{fields(receivingFields)}
					<p className="rounded-lg bg-muted p-3 text-sm">
						Boleto pago pelo Pix usa a tarifa do Pix e fica disponível na hora. Não some as duas tarifas.
					</p>
				</div>
				<div className="space-y-4 border-t pt-5">
					<h3 className="font-semibold">Crédito: percentual por prazo e parcela</h3>
					<p className="text-sm text-muted-foreground">
						O percentual incide sobre o total pago pelo comprador. Some apenas a tarifa fixa do crédito; a antecipação
						já está incluída. O valor integral da venda fica disponível no prazo escolhido.
					</p>
					<div className="overflow-x-auto">
						<Table className="w-full min-w-[560px] text-sm">
							<TableCaption className="sr-only">Taxas de crédito de 1 a 12 parcelas</TableCaption>
							<TableHeader>
								<TableRow>
									<TableHead className="p-2 text-left">Parcelas</TableHead>
									{CARD_SETTLEMENT_PERIODS.map((period) => (
										<TableHead className="p-2 text-left" key={period}>
											Recebendo em {period}
										</TableHead>
									))}
								</TableRow>
							</TableHeader>
							<TableBody>
								{Array.from({ length: 12 }, (_, index) => (
									<TableRow key={index} className="border-t">
										<TableHead className="p-2 text-left">{index + 1}x</TableHead>
										{CARD_SETTLEMENT_PERIODS.map((period) => (
											<TableCell className="p-2" key={period}>
												<Input
													aria-label={`${period} · ${index + 1} parcelas (%)`}
													type="number"
													inputMode="decimal"
													min={0}
													max={100}
													step="0.01"
													value={rates[period][index]}
													onChange={(event) =>
														update('card_rates', {
															...rates,
															[period]: rates[period].map((rate, i) =>
																i === index ? Number(event.target.value) : rate,
															),
														})
													}
												/>
											</TableCell>
										))}
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				</div>
				<div className="space-y-3 rounded-lg border p-4">
					<Label htmlFor="gateway-period">Prazo operacional da conta AbacatePay</Label>
					<Select
						value={String(settings.gateway_card_settlement_period)}
						onValueChange={(value: CardSettlementPeriod) => update('gateway_card_settlement_period', value)}
					>
						<SelectTrigger id="gateway-period" className="max-w-sm">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{CARD_SETTLEMENT_PERIODS.map((period) => (
								<SelectItem key={period} value={period}>
									Recebendo em {period}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
					<p className="text-sm text-muted-foreground">
						Informe o prazo já configurado no painel AbacatePay. Salvar aqui não altera a conta no gateway. Organizações
						que solicitaram outro prazo ficam com crédito pendente; os demais meios continuam disponíveis. A mudança
						vale para novos checkouts.
					</p>
				</div>
				<div className="space-y-4 border-t pt-5">
					<h3 className="font-semibold">Sacar e transferir</h3>
					{fields(withdrawalFields)}
					<p className="text-xs text-muted-foreground">
						As faixas mensais pertencem à conta do gateway. O contador não é reiniciado para cada organização. A tarifa
						efetiva de cada repasse é registrada na execução.
					</p>
				</div>
				<div className="space-y-4 border-t pt-5">
					<h3 className="font-semibold">Mensalidade e emissão</h3>
					{fields(otherFields)}
				</div>
			</fieldset>
			<Card className="sticky bottom-4 flex items-center justify-between gap-4 p-4">
				<p className="text-sm text-muted-foreground">Confira as taxas negociadas com o gateway antes de salvar.</p>
				<Button type="submit" loading={saving}>
					<Save className="mr-2 size-4" />
					Salvar configurações
				</Button>
			</Card>
		</form>
	);
}
