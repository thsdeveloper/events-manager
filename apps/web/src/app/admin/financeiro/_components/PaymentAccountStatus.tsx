'use client';

import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { ArrowRight, CheckCircle2, Clock3, ShieldCheck, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { PayoutSummary } from './PayoutHistory';

function PaymentAccountStatus({ organizer, payoutSummary }: { organizer: OrganizerProfile; payoutSummary: PayoutSummary | null }) {
  const enabled = organizer.payout_status === 'enabled';
  const pending = organizer.payout_status === 'pending_review';
  const StatusIcon = enabled ? CheckCircle2 : pending ? Clock3 : WalletCards;

  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm">
      <CardContent className="grid gap-6 p-0 lg:grid-cols-[1.25fr_1fr]">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-lg ${enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-violet-50 text-violet-700'}`}><StatusIcon className="size-6" /></div>
            <div><p className="text-sm font-semibold text-slate-950">{enabled ? 'Conta de repasse habilitada' : pending ? 'Dados PIX em validação' : 'Configure seus repasses'}</p><p className="mt-1 text-sm leading-6 text-slate-600">{enabled ? 'O super admin pode transferir o saldo disponível para sua chave PIX.' : pending ? 'Você já enviou os dados. A equipe da plataforma concluirá a validação.' : 'Cadastre uma chave PIX para receber o resultado líquido dos seus eventos.'}</p>{!enabled && !pending && <Button variant="link" className="mt-2 h-auto p-0 text-violet-700" asChild><Link href="/admin/configuracoes#repasses">Cadastrar chave PIX<ArrowRight className="ml-1.5 size-4" /></Link></Button>}</div>
          </div>
        </div>
        <div className="border-t bg-slate-50 p-6 lg:border-l lg:border-t-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500"><ShieldCheck className="size-4" />Processamento da plataforma</div>
          <p className="mt-3 text-sm font-medium text-slate-900">Pagamentos processados com AbacatePay</p>
          <p className="mt-1 text-sm text-slate-600">{payoutSummary?.alert ?? `${payoutSummary?.payouts?.length ?? 0} repasse(s) no histórico.`}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export default memo(PaymentAccountStatus);

