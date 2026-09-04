import { Building2, Search, TicketCheck } from 'lucide-react';
import { fetchPlatformOrganizers } from '@/features/super-admin/api/server';
import { OrganizerStatusActions } from '@/features/super-admin/components/OrganizerStatusActions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default async function OrganizersPage({ searchParams }: { searchParams: Promise<{ search?: string; status?: string; page?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.page) query.set('page', params.page);
  const result = await fetchPlatformOrganizers(query.toString());

  return <div className="space-y-6">
    <header><p className="text-sm font-semibold text-violet-700">Governança</p><h1 className="mt-1 text-3xl font-bold tracking-tight">Organizadores</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Ative contas, valide dados PIX e acompanhe o volume de cada operação.</p></header>
    <form className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><Input name="search" defaultValue={params.search} className="pl-9" placeholder="Buscar por nome ou e-mail" /></div><select name="status" defaultValue={params.status ?? ''} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm"><option value="">Todos os status</option><option value="active">Ativos</option><option value="pending">Pendentes</option><option value="archived">Arquivados</option></select><Button type="submit">Filtrar</Button></form>
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="flex items-center justify-between border-b border-slate-200 px-5 py-4"><div><h2 className="font-semibold">{result.pagination.total} organizador(es)</h2><p className="text-xs text-slate-500">Alterações de status ficam registradas na auditoria.</p></div><Building2 className="size-5 text-slate-400" /></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">Organizador</th><th className="px-5 py-3">Operação</th><th className="px-5 py-3">Receita bruta</th><th className="px-5 py-3">Controles</th></tr></thead><tbody className="divide-y divide-slate-100">{result.data.map((organizer) => <tr key={organizer.id} className="align-top hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-950">{organizer.name}</p><p className="mt-1 text-xs text-slate-500">{organizer.email}</p><p className="mt-1 text-xs text-slate-400">Desde {new Date(organizer.date_created).toLocaleDateString('pt-BR')}</p></td><td className="px-5 py-4"><div className="flex items-center gap-2 text-slate-700"><TicketCheck className="size-4 text-violet-600" />{organizer.metrics.ticketsSold} ingressos</div><p className="mt-1 text-xs text-slate-500">{organizer.metrics.events} eventos</p></td><td className="px-5 py-4 font-semibold">{currency.format(organizer.metrics.grossRevenue)}</td><td className="px-5 py-4"><OrganizerStatusActions id={organizer.id} status={organizer.status} payoutStatus={organizer.payout_status ?? 'not_configured'} /></td></tr>)}</tbody></table>{!result.data.length && <div className="p-12 text-center"><Building2 className="mx-auto size-8 text-slate-300" /><p className="mt-3 text-sm text-slate-500">Nenhum organizador encontrado.</p></div>}</div></div>
  </div>;
}

