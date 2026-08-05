'use client';

import { ChevronDown, LogOut, Plus, ShieldCheck, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { AuthUser, OrganizerProfile } from '@/lib/auth/server-auth';
import { organizerNavigation } from './AdminSidebar';
import ThemeToggle from '@/components/ui/ThemeToggle';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function AdminHeader({ user, organizer }: { user: AuthUser; organizer: OrganizerProfile; title?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const userName = `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'Usuário';
  const initials = `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() || 'U';
  async function logout() { await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }); router.push('/login'); router.refresh(); }

  return <>
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8"><div className="mx-auto flex max-w-[1600px] items-center justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-950">{organizer.name}</p><p className="text-xs text-slate-500">Gestão de eventos</p></div><div className="flex items-center gap-2"><Button size="sm" asChild className="hidden sm:inline-flex"><Link href="/admin/eventos/novo"><Plus className="mr-2 size-4" />Novo evento</Link></Button><ThemeToggle /><DropdownMenu><DropdownMenuTrigger className="flex items-center gap-2 rounded-xl p-1.5 hover:bg-slate-100"><div className="flex size-9 items-center justify-center rounded-xl bg-violet-600 text-sm font-bold text-white">{initials}</div><ChevronDown className="size-4 text-slate-400" /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-64"><div className="p-3"><p className="text-sm font-semibold">{userName}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div><DropdownMenuSeparator /><DropdownMenuItem asChild><Link href="/admin/minha-conta"><User className="mr-2 size-4" />Minha conta</Link></DropdownMenuItem>{user.role === 'super_admin' && <DropdownMenuItem asChild><Link href="/super-admin"><ShieldCheck className="mr-2 size-4" />Super admin</Link></DropdownMenuItem>}<DropdownMenuSeparator /><DropdownMenuItem onClick={logout} className="text-red-600"><LogOut className="mr-2 size-4" />Sair</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></div></header>
    <nav aria-label="Navegação móvel do organizador" className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-3 lg:hidden">{organizerNavigation.map((item) => <Link key={item.href} href={item.href} className={cn('whitespace-nowrap rounded-full px-3 py-2 text-xs font-semibold', pathname === item.href || pathname.startsWith(`${item.href}/`) ? 'bg-slate-950 text-white' : 'bg-slate-100 text-slate-700')}>{item.name}</Link>)}</nav>
  </>;
}

