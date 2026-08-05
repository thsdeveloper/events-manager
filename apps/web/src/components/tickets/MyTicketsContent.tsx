'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
	Search,
	Filter,
	Calendar,
	Ticket,
	TrendingUp,
	Grid3x3,
	List,
	Clock,
	CheckCircle2,
	XCircle,
	LayoutGrid,
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

	// Empty state
	if (registrations.length === 0) {
		return (
			<div className="mx-auto max-w-md py-16 text-center">
				<div className="mx-auto mb-6 flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
					<Ticket className="size-10 text-indigo-600" />
				</div>
				<h3 className="mb-2 text-xl font-bold text-gray-900 dark:text-white">
					Nenhum ingresso encontrado
				</h3>
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
		);
	}

	return (
		<div className="space-y-6">
			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-4">
				<div className="rounded-xl border bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 dark:from-indigo-950 dark:to-indigo-900">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">
								Total de Ingressos
							</p>
							<p className="mt-2 text-3xl font-bold text-indigo-900 dark:text-white">
								{stats.totalTickets}
							</p>
						</div>
						<Ticket className="size-12 text-indigo-600/20" />
					</div>
				</div>

				<div className="rounded-xl border bg-gradient-to-br from-purple-50 to-purple-100 p-6 dark:from-purple-950 dark:to-purple-900">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-purple-700 dark:text-purple-300">
								Próximos Eventos
							</p>
							<p className="mt-2 text-3xl font-bold text-purple-900 dark:text-white">
								{stats.upcomingEvents}
							</p>
						</div>
						<Calendar className="size-12 text-purple-600/20" />
					</div>
				</div>

				<div className="rounded-xl border bg-gradient-to-br from-green-50 to-green-100 p-6 dark:from-green-950 dark:to-green-900">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-green-700 dark:text-green-300">Check-ins</p>
							<p className="mt-2 text-3xl font-bold text-green-900 dark:text-white">
								{stats.checkedIn}
							</p>
						</div>
						<CheckCircle2 className="size-12 text-green-600/20" />
					</div>
				</div>

				<div className="rounded-xl border bg-gradient-to-br from-amber-50 to-amber-100 p-6 dark:from-amber-950 dark:to-amber-900">
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm font-medium text-amber-700 dark:text-amber-300">
								Total Investido
							</p>
							<p className="mt-2 text-2xl font-bold text-amber-900 dark:text-white">
								{new Intl.NumberFormat('pt-BR', {
									style: 'currency',
									currency: 'BRL',
								}).format(stats.totalSpent)}
							</p>
						</div>
						<TrendingUp className="size-12 text-amber-600/20" />
					</div>
				</div>
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="relative flex-1 sm:max-w-md">
					<Search className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-gray-400" />
					<input
						type="text"
						placeholder="Buscar por evento, código ou tipo..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800"
					/>
				</div>

				<div className="flex items-center gap-2">
					<button
						onClick={() => setViewMode('grid')}
						className={`rounded-lg border p-2.5 transition-colors ${viewMode === 'grid' ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
						title="Visualização em grade"
					>
						<Grid3x3 className="size-5" />
					</button>
					<button
						onClick={() => setViewMode('list')}
						className={`rounded-lg border p-2.5 transition-colors ${viewMode === 'list' ? 'border-indigo-600 bg-indigo-50 text-indigo-600 dark:bg-indigo-950' : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700'}`}
						title="Visualização em lista"
					>
						<List className="size-5" />
					</button>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex gap-2 overflow-x-auto pb-2">
				{tabs.map((tab) => {
					const Icon = tab.icon;
					
return (
						<button
							key={tab.key}
							onClick={() => setSelectedTab(tab.key)}
							className={`flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${selectedTab === tab.key ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'}`}
						>
							<Icon className="size-4" />
							{tab.label}
							<span
								className={`ml-1 rounded-full px-2 py-0.5 text-xs font-bold ${selectedTab === tab.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}
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
					className={viewMode === 'grid' ? 'grid gap-6 md:grid-cols-2 lg:grid-cols-3' : 'space-y-4'}
				>
					{filteredTickets.map((registration) => (
						<TicketCard
							key={registration.id}
							registration={registration}
							onViewDetails={setSelectedTicket}
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
