'use client';

import { ArrowUpRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function PayoutCreationPanel({ organizers }: { organizers: Array<{ id: string; name: string }> }) {
  const router = useRouter();
  const [organizerId, setOrganizerId] = useState(organizers[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  async function create() {
    setSaving(true); setFeedback(null);
    try {
      const response = await fetch('/api/super-admin/finance/payouts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ organizer_id: organizerId, amount: Number(amount) }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível criar o repasse.');
      setAmount(''); setFeedback('Repasse processado com sucesso.'); router.refresh();
    } catch (error) { setFeedback(error instanceof Error ? error.message : 'Falha ao processar repasse.'); } finally { setSaving(false); }
  }

  return <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center gap-2"><div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><ArrowUpRight className="size-5" /></div><div><h2 className="font-semibold">Novo repasse</h2><p className="text-xs text-slate-500">A API valida chave PIX, limite mínimo e saldo.</p></div></div>{organizers.length ? <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px_auto] sm:items-end"><div className="space-y-2"><Label>Organizador</Label><Select value={organizerId} onValueChange={setOrganizerId}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{organizers.map((organizer) => <SelectItem key={organizer.id} value={organizer.id}>{organizer.name}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label htmlFor="payout-amount">Valor</Label><Input id="payout-amount" type="number" min="3.5" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} placeholder="R$ 0,00" /></div><Button onClick={create} disabled={saving || !organizerId || Number(amount) <= 0}>{saving && <Loader2 className="mr-2 size-4 animate-spin" />}Transferir</Button></div> : <p className="mt-5 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">Nenhum organizador possui chave PIX aprovada.</p>}{feedback && <p role="status" className="mt-3 text-sm text-slate-600">{feedback}</p>}</div>;
}

