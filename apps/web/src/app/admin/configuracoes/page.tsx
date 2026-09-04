import { BadgeCheck, ShieldCheck } from 'lucide-react';
import { PayoutSettingsCard } from '@/features/organizer-settings/components/PayoutSettingsCard';
import { OrganizerProfileSettings } from '@/features/organizer-settings/components/OrganizerProfileSettings';
import { requireOrganizer } from '@/lib/auth/server-auth';

export default async function OrganizerSettingsPage() {
  const { organizer } = await requireOrganizer();

  return (
    <div className="w-full space-y-6">
      <header className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-violet-700"><BadgeCheck className="size-4" />Conta do organizador</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">Perfil e repasses</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Mantenha os dados públicos da organização e a chave PIX de recebimento em um único lugar.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"><ShieldCheck className="size-4" />Perfil ativo</div>
        </div>
      </header>
      <OrganizerProfileSettings organizer={organizer} />
      <PayoutSettingsCard organizer={organizer} />
    </div>
  );
}

