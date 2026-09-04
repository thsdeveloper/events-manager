import type { LucideIcon } from 'lucide-react';

export function PlatformMetricCard({ label, value, helper, icon: Icon, tone = 'violet' }: { label: string; value: string; helper: string; icon: LucideIcon; tone?: 'violet' | 'emerald' | 'blue' | 'amber' }) {
  const tones = { violet: 'bg-violet-50 text-violet-700', emerald: 'bg-emerald-50 text-emerald-700', blue: 'bg-blue-50 text-blue-700', amber: 'bg-amber-50 text-amber-700' };

  return <article className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-medium text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><div className={`flex size-11 items-center justify-center rounded-lg ${tones[tone]}`}><Icon className="size-5" /></div></div><p className="mt-4 text-xs leading-5 text-slate-500">{helper}</p></article>;
}

