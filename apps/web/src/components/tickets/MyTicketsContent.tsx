'use client';

import { useMemo, useState } from 'react';
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
import { isFuture } from 'date-fns';
import type { NominalTicket } from '@events-manager/contracts';
import { AccountEmptyState } from '@/components/account/AccountEmptyState';
import { Ticket as AnimatedTicket } from '@/components/animate-ui/icons/ticket';
import { Button } from '@/components/ui/button';
import { FilterSheet } from '@/components/shared/FilterSheet';
import { FilterInput, FilterSelect } from '@/components/shared/FilterFields';
import { PurchaseCard } from '@/features/tickets/components/PurchaseCard';
import { groupTicketPurchases } from '@/features/tickets/purchases';
import { emptyIllustrations } from '@/lib/illustrations';
import { getTicketAccess } from '@/features/tickets/ticket-access';

interface MyTicketsContentProps {
	tickets: NominalTicket[];
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
		<li className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
			<span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${STAT_TONES[tone]}`}>
				<Icon className="size-4" />
			</span>
			<div className="min-w-0">
				<p className="truncate text-xs text-slate-500 dark:text-slate-400">{label}</p>
				<p className="truncate text-base font-semibold text-slate-950 dark:text-white">{value}</p>
			</div>
		</li>
	);
}

/** A pessoa pagou por este ingresso: ele é dela ou ela pode nomear quem vai. */
function boughtByMe(ticket: NominalTicket) {
	return ticket.purchased_by_me ?? Boolean(ticket.can_edit_attendee || ticket.is_buyer);
}

export function MyTicketsContent({ tickets: initialTickets }: MyTicketsContentProps) {
	const [selectedTab, setSelectedTab] = useState<TabType>('upcoming');
	const [searchQuery, setSearchQuery] = useState('');
	const [viewMode, setViewMode] = useState<ViewMode>('grid');
	const tickets = initialTickets;

	// Categorize tickets
	const categorizedTickets = useMemo(() => {
		const upcoming: NominalTicket[] = [];
		const past: NominalTicket[] = [];
		const cancelled: NominalTicket[] = [];

		tickets.forEach((ticket) => {
			if (ticket.registration.status === 'cancelled' || ticket.registration.payment_status === 'refunded') {
				cancelled.push(ticket);

				return;
			}

			const eventDate = ticket.event.start_date ? new Date(ticket.event.start_date) : null;

			if (eventDate) {
				if (isFuture(eventDate)) {
					upcoming.push(ticket);
				} else {
					past.push(ticket);
				}
			} else {
				upcoming.push(ticket); // Default to upcoming if no date
			}
		});

		return { upcoming, past, cancelled, all: tickets };
	}, [tickets]);

	// Filter tickets based on search
	const filteredTickets = useMemo(() => {
		const tickets = categorizedTickets[selectedTab];

		if (!searchQuery.trim()) return tickets;

		const query = searchQuery.toLowerCase();

		return tickets.filter((ticket) => {
			const eventTitle = ticket.event.title ?? '';
			const ticketType = ticket.ticket_type?.title ?? '';
			const attendee = ticket.attendee_name ?? '';

			return (
				eventTitle.toLowerCase().includes(query) ||
				ticket.ticket_code.toLowerCase().includes(query) ||
				ticketType.toLowerCase().includes(query) ||
				attendee.toLowerCase().includes(query)
			);
		});
	}, [categorizedTickets, selectedTab, searchQuery]);

	const filteredPurchases = useMemo(() => {
		const matched = new Set(filteredTickets.map((ticket) => ticket.id));

		return groupTicketPurchases(tickets).filter((purchase) =>
			purchase.tickets.some((ticket) => matched.has(ticket.id)),
		);
	}, [tickets, filteredTickets]);

	// Calculate stats. "Investido" soma só o que a pessoa pagou: um ingresso
	// comprado por outra pessoa em nome dela conta como ingresso, não como gasto.
	const stats = useMemo(() => {
		const totalTickets = tickets.length;
		const totalSpent = tickets
			.filter((ticket) => boughtByMe(ticket) && getTicketAccess(ticket).paymentConfirmed)
			.reduce((sum, ticket) => sum + Number(ticket.total_amount || 0), 0);
		const upcomingEvents = categorizedTickets.upcoming.length;
		const checkedIn = tickets.filter((ticket) => ticket.check_in_date !== null).length;

		return { totalTickets, totalSpent, upcomingEvents, checkedIn };
	}, [tickets, categorizedTickets]);

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
			count: tickets.length,
		},
	];

	// Same empty state as the other account sections (see AccountEmptyState).
	if (tickets.length === 0) {
		return (
			<AccountEmptyState
				icon={<AnimatedTicket />}
				illustration={emptyIllustrations.tickets}
				title="Nenhum ingresso por aqui"
				description="Quando você comprar um ingresso, ele aparecerá nesta área com o código, a data e o local do evento."
				action={
					<Button asChild className="rounded-lg">
						<Link href="/eventos">
							<Calendar className="size-4" />
							Explorar eventos
						</Link>
					</Button>
				}
			/>
		);
	}

	return (
		<div className="space-y-4">
			{/* Stats — compact row: these are context, not the subject of the page. */}
			<ul aria-label="Resumo dos ingressos" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard icon={Ticket} tone="indigo" label="Ingressos" value={String(stats.totalTickets)} />
				<StatCard icon={Calendar} tone="violet" label="Próximos" value={String(stats.upcomingEvents)} />
				<StatCard icon={CheckCircle2} tone="emerald" label="Check-ins" value={String(stats.checkedIn)} />
				<StatCard icon={TrendingUp} tone="amber" label="Investido" value={currency.format(stats.totalSpent)} />
			</ul>

			{/* Search and Filters */}
			<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<FilterSheet
					title="Filtros de ingressos"
					values={{ search: searchQuery, period: selectedTab }}
					defaultValues={{ search: '', period: 'upcoming' as TabType }}
					activeCount={Number(Boolean(searchQuery)) + Number(selectedTab !== 'upcoming')}
					onApply={(draft) => {
						setSearchQuery(draft.search);
						setSelectedTab(draft.period);
					}}
				>
					{(draft, setDraft) => (
						<>
							<FilterInput
								label="Buscar ingressos"
								placeholder="Evento, código, tipo ou participante"
								value={draft.search}
								onChange={(event) => setDraft({ ...draft, search: event.target.value })}
							/>
							<FilterSelect
								label="Período dos ingressos"
								value={draft.period}
								onChange={(period) => setDraft({ ...draft, period })}
								options={tabs.map((tab) => ({ value: tab.key, label: `${tab.label} (${tab.count})` }))}
							/>
						</>
					)}
				</FilterSheet>

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

			{/* Tickets Grid/List */}
			{filteredTickets.length === 0 ? (
				<div className="py-16 text-center">
					<Search className="mx-auto mb-4 size-12 text-gray-400" />
					<p className="text-gray-600 dark:text-gray-400">Nenhum ingresso encontrado com os filtros aplicados.</p>
				</div>
			) : (
				<div className={viewMode === 'grid' ? 'grid gap-4 sm:grid-cols-2 xl:grid-cols-3' : 'space-y-2'}>
					{filteredPurchases.map((purchase) => (
						<PurchaseCard key={purchase.id} purchase={purchase} variant={viewMode} />
					))}
				</div>
			)}
		</div>
	);
}
