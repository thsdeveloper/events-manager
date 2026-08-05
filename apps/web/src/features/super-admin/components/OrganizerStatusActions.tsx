'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function OrganizerStatusActions({ id, status, payoutStatus }: { id: string; status: string; payoutStatus: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  async function update(payload: { status?: string; payout_status?: string }) {
    setSaving(true);
    try {
      const response = await fetch(`/api/super-admin/organizers/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!response.ok) { const body = await response.json().catch(() => null); throw new Error(body?.detail ?? 'Falha ao atualizar.'); }
      router.refresh();
    } finally { setSaving(false); }
  }

  return <div className="flex min-w-[300px] items-center gap-2">{saving && <Loader2 className="size-4 animate-spin text-violet-600" />}<Select value={status} onValueChange={(value) => update({ status: value })} disabled={saving}><SelectTrigger aria-label="Status do organizador" className="h-9 w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="active">Ativo</SelectItem><SelectItem value="pending">Pendente</SelectItem><SelectItem value="archived">Arquivado</SelectItem></SelectContent></Select><Select value={payoutStatus} onValueChange={(value) => update({ payout_status: value })} disabled={saving}><SelectTrigger aria-label="Status de repasse" className="h-9 w-40"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="not_configured">Sem chave PIX</SelectItem><SelectItem value="pending_review">Validar PIX</SelectItem><SelectItem value="enabled">PIX aprovado</SelectItem><SelectItem value="blocked">PIX bloqueado</SelectItem></SelectContent></Select></div>;
}

