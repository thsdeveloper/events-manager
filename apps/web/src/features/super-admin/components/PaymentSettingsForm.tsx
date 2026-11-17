'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BadgeDollarSign, CheckCircle2, CreditCard, Landmark, Save, Smartphone, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const fields = [
	{
		key: 'platform_fee_minimum',
		label: 'Taxa mínima por ingresso',
		suffix: 'R$',
		helper: 'Aplicada quando superar o percentual. Ingressos gratuitos não recebem taxa.',
		icon: BadgeDollarSign,
	},
	{
		key: 'platform_fee_percentage',
		label: 'Taxa da plataforma',
		suffix: '%',
		helper: 'Receita da plataforma sobre o preço base.',
		icon: BadgeDollarSign,
	},
	{
		key: 'pix_fee_fixed',
		label: 'Receber via PIX',
		suffix: 'R$',
		helper: 'Tarifa fixa por pagamento PIX.',
		icon: Smartphone,
	},
	{
		key: 'card_fee_percentage',
		label: 'Cartão à vista',
		suffix: '%',
		helper: 'Percentual por pagamento em cartão.',
		icon: CreditCard,
	},
	{
		key: 'card_fee_fixed',
		label: 'Fixa do cartão',
		suffix: 'R$',
		helper: 'Valor fixo somado à taxa percentual.',
		icon: CreditCard,
	},
	{
		key: 'card_installment_2_6_percentage',
		label: 'Cartão 2–6x',
		suffix: '%',
		helper: 'Percentual para parcelamentos curtos.',
		icon: CreditCard,
	},
	{
		key: 'card_installment_7_12_percentage',
		label: 'Cartão 7–12x',
		suffix: '%',
		helper: 'Percentual para parcelamentos longos.',
		icon: CreditCard,
	},
	{
		key: 'boleto_fee_fixed',
		label: 'Receber via boleto',
		suffix: 'R$',
		helper: 'Tarifa fixa por boleto compensado.',
		icon: Landmark,
	},
	{
		key: 'payout_fee_fixed',
		label: 'Transferência PIX',
		suffix: 'R$',
		helper: 'Custo previsto por repasse.',
		icon: WalletCards,
	},
	{
		key: 'minimum_payout',
		label: 'Repasse mínimo',
		suffix: 'R$',
		helper: 'Menor valor permitido por repasse.',
		icon: WalletCards,
	},
] as const;

export function PaymentSettingsForm({
	initialSettings,
	runtimeProvider,
}: {
	initialSettings: Record<string, any>;
	runtimeProvider: string;
}) {
	const [settings, setSettings] = useState(initialSettings);
	const [saving, setSaving] = useState(false);
	const [feedback, setFeedback] = useState<string | null>(null);
	async function save() {
		setSaving(true);
		setFeedback(null);
		try {
			const payload = {
				...Object.fromEntries(fields.map((field) => [field.key, Number(settings[field.key] ?? 0)])),
				payouts_enabled: Boolean(settings.payouts_enabled),
				convenience_fee_calculation_method: settings.convenience_fee_calculation_method ?? 'buyer_pays',
			};
			const response = await fetch('/api/super-admin/settings/payments', {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível salvar as taxas.');
			setSettings(body.settings);
			setFeedback('Configurações salvas e registradas na auditoria.');
		} catch (error) {
			setFeedback(error instanceof Error ? error.message : 'Falha ao salvar.');
		} finally {
			setSaving(false);
		}
	}

	return (
		<div className="space-y-6">
			<Card className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<div className="flex items-center gap-2">
						<CheckCircle2
							className={`size-5 ${runtimeProvider === 'mock' ? 'text-muted-foreground' : 'text-muted-foreground'}`}
						/>
						<p className="font-semibold">{runtimeProvider === 'mock' ? 'Simulação local ativa' : 'AbacatePay ativo'}</p>
					</div>
					<p className="mt-1 text-sm text-muted-foreground">
						As taxas abaixo alimentam a precificação e os relatórios. A tarifa efetiva vem do webhook.
					</p>
				</div>
				<div className="flex items-center gap-3 rounded-lg bg-muted px-4 py-3">
					<div>
						<p className="text-sm font-semibold">Repasses reais</p>
						<p className="text-xs text-muted-foreground">Chave de segurança operacional</p>
					</div>
					<Switch
						checked={Boolean(settings.payouts_enabled)}
						onCheckedChange={(checked) => setSettings((current: any) => ({ ...current, payouts_enabled: checked }))}
						aria-label="Habilitar repasses reais"
					/>
				</div>
			</Card>
			<div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
				{fields.map((field) => {
					const Icon = field.icon;

					return (
						<Label key={field.key} className="rounded-lg border border-border bg-card p-5 shadow-sm">
							<div className="flex items-start justify-between">
								<div className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
									<Icon className="size-5" />
								</div>
								<Badge variant="secondary">{field.suffix}</Badge>
							</div>
							<Label htmlFor={field.key} className="mt-4 block text-base">
								{field.label}
							</Label>
							<p className="mt-1 min-h-10 text-xs leading-5 text-muted-foreground">{field.helper}</p>
							<Input
								id={field.key}
								inputMode="decimal"
								type="number"
								min="0"
								step="0.01"
								className="mt-3 text-lg"
								value={settings[field.key] ?? 0}
								onChange={(event) => setSettings((current: any) => ({ ...current, [field.key]: event.target.value }))}
							/>
						</Label>
					);
				})}
			</div>
			<Card className="sticky bottom-4 flex flex-col gap-3 p-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
				<p role="status" className="text-sm text-muted-foreground">
					{feedback ?? 'Revise os valores antes de publicar uma alteração.'}
				</p>
				<Button onClick={save} loading={saving}>
					<Save className="mr-2 size-4" />
					Salvar configurações
				</Button>
			</Card>
		</div>
	);
}
