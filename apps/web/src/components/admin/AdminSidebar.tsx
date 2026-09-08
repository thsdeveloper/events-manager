'use client';

import { BarChart3, Building2, Calendar, LayoutDashboard, Settings, Ticket, UserCog, Users, Wallet } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { OrganizationSwitcher, type OrganizationOption } from '@/features/organizer-settings/components/OrganizationSwitcher';
import { cn } from '@/lib/utils';

export const organizerNavigation = [
  { name: 'Visão geral', href: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Eventos', href: '/admin/eventos', icon: Calendar },
  { name: 'Participantes', href: '/admin/participantes', icon: Users },
  { name: 'Análises', href: '/admin/analises', icon: BarChart3 },
  { name: 'Financeiro', href: '/admin/financeiro', icon: Wallet },
  { name: 'Configurações', href: '/admin/configuracoes', icon: Settings },
];

export default function AdminSidebar({ organizer, organizations }: { organizer: OrganizerProfile; organizations: OrganizationOption[] }) {
  const pathname = usePathname();
  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  return <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col border-r border-slate-200 bg-white lg:flex">
    <div className="border-b border-slate-200 p-4"><OrganizationSwitcher organizations={organizations} activeId={organizer.id} /></div>
    <nav aria-label="Navegação do organizador" className="flex-1 space-y-1 overflow-y-auto p-4">{organizerNavigation.map((item) => { const Icon = item.icon; 

return <Link key={item.href} href={item.href} className={cn('flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors', isActive(item.href) ? 'bg-violet-50 text-violet-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950')}><Icon className={cn('size-5', isActive(item.href) ? 'text-violet-600' : 'text-slate-400')} />{item.name}</Link>; })}</nav>
    <div className="border-t border-slate-200 p-4"><Link href="/" className="flex items-center justify-center rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Ver site público</Link></div>
  </aside>;
}

