'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
	Search,
	Calendar,
	Ticket,
	TrendingUp,
	Grid3x3,
	List,
	Clock,
	CheckCircle2,
	XCircle,
	LayoutGrid,
	type LucideIcon,
} from 'lucide-react';
import { isPast, isFuture } from 'date-fns';
import type { EventRegistration } from '@events-manager/contracts';
import { TicketCard } from './TicketCard';
import { TicketDetailsModal } from './TicketDetailsModal';

interface MyTicketsContentProps {
	registrations: EventRegistration[];
}

type TabType = 'upcoming' | 'past' | 'cancelled' | 'all';
type ViewMode = 'grid' | 'list';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const STAT_TONES = {
	indigo: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300',
	violet: 'bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-300',
	emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300',
	amber: 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300',
} as const;

/**
 * Colour is carried by a small icon chip instead of a full-card gradient: the
 * four cards sit next to the white panels used across the account pages, and the
 * gradients made them read as the primary content.
 */
function StatCard({
	icon: Icon,
	tone,
	label,
	value,
}: {
	icon: LucideIcon;
	tone: keyof typeof STAT_TONES;
	label: string;
	value: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
			<span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${STAT_TONES[tone]}`}>
				<Icon className="size-4" />
			</span>
			<div className="min-w-0">
				<p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
				<p className="truncate text-base font-semibold text-slate-950 dark:text-white">{value}</p>
			</div>
		</div>
	);
}

export function MyTicketsContent({ registrations }: MyTicketsContentProps) {
	const [selectedTab, setSelectedTab] = useState<TabType>('upcoming');
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('grid');
	const [selectedTicket, setSelectedTicket] = useState<EventRegistration | null>(null);

	// Categorize tickets
	const categorizedTickets = useMemo(() => {
		const upcoming: EventRegistration[] = [];
		const past: EventRegistration[] = [];
		const cancelled: EventRegistration[] = [];

		registrations.forEach((reg) => {
			if (reg.status === 'cancelled') {
				cancelled.push(reg);
				
return;
			}

			const event = reg.event_id;
			const eventDate = event && typeof event === 'object' && 'start_date' in event
				? new Date(event.start_date as string)
				: null;

			if (eventDate) {
				if (isFuture(eventDate)) {
					upcoming.push(reg);
				} else {
					past.push(reg);
				}
			} else {
				upcoming.push(reg); // Default to upcoming if no date
			}
		});

		return { upcoming, past, cancelled, all: registrations };
	}, [registrations]);

	// Filter tickets based on search
	const filteredTickets = useMemo(() => {
		const tickets = categorizedTickets[selectedTab];

		if (!searchQuery.trim()) return tickets;

		const query = searchQuery.toLowerCase();
		
return tickets.filter((reg) => {
			const event = reg.event_id;
			const eventTitle = event && typeof event === 'object' && 'title' in event
				? event.title
				: '';
			const ticketCode = reg.ticket_code || '';
			const ticketType = reg.ticket_type_id && typeof reg.ticket_type_id === 'object' && 'title' in reg.ticket_type_id
				? reg.ticket_type_id.title
				: '';

			return (
				eventTitle?.toString().toLowerCase().includes(query) ||
				ticketCode.toLowerCase().includes(query) ||
				ticketType?.toString().toLowerCase().includes(query)
			);
		});
	}, [categorizedTickets, selectedTab, searchQuery]);

	// Calculate stats
	const stats = useMemo(() => {
		const totalTickets = registrations.reduce((sum, reg) => sum + (reg.quantity || 1), 0);
		const totalSpent = registrations.reduce((sum, reg) => sum + Number(reg.total_amount || 0), 0);
		const upcomingEvents = categorizedTickets.upcoming.length;
		const checkedIn = registrations.filter((reg) => reg.check_in_date !== null).length;

		return { totalTickets, totalSpent, upcomingEvents, checkedIn };
	}, [registrations, categorizedTickets]);

	const tabs: { key: TabType; label: string; icon: React.ElementType; count: number }[] = [
		{
			key: 'upcoming',
			label: 'Próximos',
			icon: Calendar,
			count: categorizedTickets.upcoming.length,
		},
		{
			key: 'past',
			label: 'Passados',
			icon: Clock,
			count: categorizedTickets.past.length,
		},
		{
			key: 'cancelled',
			label: 'Cancelados',
			icon: XCircle,
			count: categorizedTickets.cancelled.length,
		},
		{
			key: 'all',
			label: 'Todos',
			icon: LayoutGrid,
			count: registrations.length,
		},
	];

	// Empty state — carries the same surface as the other /perfil blocks so it
	// reads as a panel instead of floating loose on the page background.
	if (registrations.length === 0) {
		return (
			<div className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
				<div className="mx-auto max-w-md px-6 py-16 text-center">
					<div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
						<Ticket className="size-10 text-indigo-600" />
					</div>
					<h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">Nenhum ingresso encontrado</h3>
					<p className="mb-8 text-gray-600 dark:text-gray-400">
						Você ainda não comprou nenhum ingresso. Explore os eventos disponíveis e garanta o seu!
					</p>
					<Link
						href="/eventos"
						className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-3 font-medium text-white shadow-lg transition-all hover:shadow-xl hover:from-indigo-700 hover:to-purple-700"
					>
						<Calendar className="size-5" />
						Explorar Eventos
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Stats — compact row: these are context, not the subject of the page. */}
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard icon={Ticket} tone="indigo" label="Ingressos" value={String(stats.totalTickets)} />
				<StatCard icon={Calendar} tone="violet" label="Próximos" value={String(stats.upcomingEvents)} />
				<StatCard icon={CheckCircle2} tone="emerald" label="Check-ins" value={String(stats.checkedIn)} />
				<StatCard icon={TrendingUp} tone="amber" label="Investido" value={currency.format(stats.totalSpent)} />
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative flex-1 sm:max-w-md">
					<Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
					<input
						type="text"
						placeholder="Buscar por evento, código ou tipo..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-4 text-sm focus:border-violet-500 focus:outline-none focus:ring-2 focus:ring-violet-500/20 dark:border-gray-700 dark:bg-gray-800"
					/>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => setViewMode('grid')}
						className={`rounded-lg border p-2 transition-colors ${viewMode === 'grid' ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
						title="Visualização em grade"
					>
						<Grid3x3 className="size-4" />
					</button>
					<button
						onClick={() => setViewMode('list')}
						className={`rounded-lg border p-2 transition-colors ${viewMode === 'list' ? 'border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-200' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
						title="Visualização em lista"
					>
						<List className="size-4" />
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-2 overflow-x-auto pb-1">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					
return (
						<button
							key={tab.key}
							onClick={() => setSelectedTab(tab.key)}
							className={`flex shrink-0 items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${selectedTab === tab.key ? 'border-violet-600 bg-violet-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'}`}
						>
							<Icon className="size-4" />
							{tab.label}
							<span
								className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${selectedTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}
							>
								{tab.count}
							</span>
						</button>
					);
				})}
			</div>

			{/* Tickets Grid/List */}
			{filteredTickets.length === 0 ? (
				<div className="py-16 text-center">
					<Search className="mx-auto mb-4 size-12 text-gray-400" />
					<p className="text-gray-600 dark:text-gray-400">
						Nenhum ingresso encontrado com os filtros aplicados.
					</p>
				</div>
			) : (
				<div
					className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}
				>
					{filteredTickets.map((registration) => (
						<TicketCard
							key={registration.id}
							registration={registration}
							onViewDetails={setSelectedTicket}
							variant={viewMode}
						/>
					))}
				</div>
			)}

			{/* Details Modal */}
			{selectedTicket && (
				<TicketDetailsModal
					registration={selectedTicket}
					onClose={() => setSelectedTicket(null)}
				/>
			)}
		</div>
	);
}
