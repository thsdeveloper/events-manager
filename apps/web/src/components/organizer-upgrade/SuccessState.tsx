'use client';

import { ArrowRight, CalendarDays, ChartNoAxesCombined, CheckCircle2, Settings2, WalletCards } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const nextSteps = [
  { title: 'Crie seu primeiro evento', description: 'Defina data, local, lotes e publicação.', href: '/admin/eventos/novo', icon: CalendarDays },
  { title: 'Configure seu perfil', description: 'Revise identidade e contato da organização.', href: '/admin/minha-conta', icon: Settings2 },
  { title: 'Acompanhe o financeiro', description: 'Veja vendas, taxas, saldo e repasses por evento.', href: '/admin/financeiro', icon: WalletCards },
];

export function SuccessState({ organizerName = 'Organizador' }: { organizerName?: string; onGetStarted?: () => void }) {

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50 via-white to-violet-50 p-8 shadow-sm sm:p-12">
        <div className="relative z-10 max-w-2xl">
          <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-200"><CheckCircle2 className="size-7" /></div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emerald-700">Conta liberada</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Tudo pronto, {organizerName}.</h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-slate-600">Seu workspace está ativo. Você já pode publicar eventos, vender ingressos e acompanhar toda a operação sem configurar uma conta externa.</p>
          <div className="mt-7 flex flex-wrap gap-3"><Button size="lg" asChild><Link href="/admin/eventos/novo">Criar evento<ArrowRight className="ml-2 size-4" /></Link></Button><Button size="lg" variant="outline" asChild><Link href="/admin/dashboard"><ChartNoAxesCombined className="mr-2 size-4" />Abrir dashboard</Link></Button></div>
        </div>
        <div aria-hidden className="absolute -right-24 -top-24 size-72 rounded-full bg-violet-200/40 blur-3xl" />
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {nextSteps.map((step, index) => {
          const Icon = step.icon;

          return <Card key={step.href} className="border-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><CardContent className="p-6"><div className="flex items-center justify-between"><div className="flex size-11 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><Icon className="size-5" /></div><span className="text-xs font-semibold text-slate-400">0{index + 1}</span></div><h2 className="mt-5 font-semibold text-slate-950">{step.title}</h2><p className="mt-2 min-h-10 text-sm leading-5 text-slate-600">{step.description}</p><Link className="mt-5 inline-flex items-center text-sm font-semibold text-violet-700 hover:text-violet-900" href={step.href}>Começar<ArrowRight className="ml-1.5 size-4" /></Link></CardContent></Card>;
        })}
      </div>
    </div>
  );
}

