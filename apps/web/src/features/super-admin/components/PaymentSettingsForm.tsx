'use client';

import { BadgeDollarSign, CheckCircle2, CreditCard, Landmark, Save, Smartphone, WalletCards } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';

const fields = [
  { key: 'platform_fee_percentage', label: 'Taxa da plataforma', suffix: '%', helper: 'Receita da plataforma sobre o preço base.', icon: BadgeDollarSign },
  { key: 'pix_fee_fixed', label: 'Receber via PIX', suffix: 'R$', helper: 'Tarifa fixa por pagamento PIX.', icon: Smartphone },
  { key: 'card_fee_percentage', label: 'Cartão à vista', suffix: '%', helper: 'Percentual por pagamento em cartão.', icon: CreditCard },
  { key: 'card_fee_fixed', label: 'Fixa do cartão', suffix: 'R$', helper: 'Valor fixo somado à taxa percentual.', icon: CreditCard },
  { key: 'card_installment_2_6_percentage', label: 'Cartão 2–6x', suffix: '%', helper: 'Percentual para parcelamentos curtos.', icon: CreditCard },
  { key: 'card_installment_7_12_percentage', label: 'Cartão 7–12x', suffix: '%', helper: 'Percentual para parcelamentos longos.', icon: CreditCard },
  { key: 'boleto_fee_fixed', label: 'Receber via boleto', suffix: 'R$', helper: 'Tarifa fixa por boleto compensado.', icon: Landmark },
  { key: 'payout_fee_fixed', label: 'Transferência PIX', suffix: 'R$', helper: 'Custo previsto por repasse.', icon: WalletCards },
  { key: 'minimum_payout', label: 'Repasse mínimo', suffix: 'R$', helper: 'Menor valor permitido por repasse.', icon: WalletCards },
] as const;

export function PaymentSettingsForm({ initialSettings, runtimeProvider }: { initialSettings: Record<string, any>; runtimeProvider: string }) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  async function save() {
    setSaving(true); setFeedback(null);
    try {
      const payload = { ...Object.fromEntries(fields.map((field) => [field.key, Number(settings[field.key])])), payouts_enabled: Boolean(settings.payouts_enabled), convenience_fee_calculation_method: settings.convenience_fee_calculation_method ?? 'buyer_pays' };
      const response = await fetch('/api/super-admin/settings/payments', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível salvar as taxas.');
      setSettings(body.settings); setFeedback('Configurações salvas e registradas na auditoria.');
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha ao salvar.'); } finally { setSaving(false); }
  }

  return <div className="space-y-6">
    <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><CheckCircle2 className={`size-5 ${runtimeProvider === 'mock' ? 'text-amber-600' : 'text-emerald-600'}`} /><p className="font-semibold">{runtimeProvider === 'mock' ? 'Simulação local ativa' : 'AbacatePay ativo'}</p></div><p className="mt-1 text-sm text-slate-500">As taxas abaixo alimentam a precificação e os relatórios. A tarifa efetiva vem do webhook.</p></div><div className="flex items-center gap-3 rounded-lg bg-slate-50 px-4 py-3"><div><p className="text-sm font-semibold">Repasses reais</p><p className="text-xs text-slate-500">Chave de segurança operacional</p></div><Switch checked={Boolean(settings.payouts_enabled)} onCheckedChange={(checked) => setSettings((current: any) => ({ ...current, payouts_enabled: checked }))} aria-label="Habilitar repasses reais" /></div></div>
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{fields.map((field) => { const Icon = field.icon; 

return <label key={field.key} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between"><div className="flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700"><Icon className="size-5" /></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{field.suffix}</span></div><Label htmlFor={field.key} className="mt-4 block text-base">{field.label}</Label><p className="mt-1 min-h-10 text-xs leading-5 text-slate-500">{field.helper}</p><Input id={field.key} inputMode="decimal" type="number" min="0" step="0.01" className="mt-3 text-lg font-semibold" value={settings[field.key] ?? 0} onChange={(event) => setSettings((current: any) => ({ ...current, [field.key]: event.target.value }))} /></label>; })}</div>
    <div className="sticky bottom-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:items-center sm:justify-between"><p role="status" className="text-sm text-slate-600">{feedback ?? 'Revise os valores antes de publicar uma alteração.'}</p><Button onClick={save} loading={saving}><Save className="mr-2 size-4" />Salvar configurações</Button></div>
  </div>;
}

