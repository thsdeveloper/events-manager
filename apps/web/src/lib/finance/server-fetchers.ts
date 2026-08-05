import 'server-only';

import type { OrganizerProfile } from '@/lib/auth/server-auth';
import { authenticatedBackendFetch } from '@/lib/backend-auth';

export type EventsOption = { id: string; title: string };

export type OverviewMetrics = {
	gross: number;
	serviceFees: number;
	net: number;
	ticketsSold: number;
	totalTransactions: number;
	averageTicket: number;
	pendingCount: number;
	refundedCount: number;
	allRegistrations: number;
	allGross: number;
};

export type TransactionRow = {
	id: string;
	date: string;
	status: string;
	transactionId: string;
	eventTitle: string;
	participantName: string;
	participantEmail: string;
	quantity: number;
	gross: number;
	fee: number;
	net: number;
	paymentStatus: string;
	paymentIntentId: string;
};

export type PaginationState = { page: number; limit: number; total: number; pageCount: number };
export type TransactionsResult = { data: TransactionRow[]; pagination: PaginationState };
export type PayoutItem = { id: string; amount: number; currency: string; status: string; createdAt: string | null; arrivalDate: string | null; description: string | null; statementDescriptor: string | null; destination: string | null };
export type PayoutSummary = { balance: { available: number; pending: number; currency: string }; payouts: PayoutItem[]; alert?: string };
export type AppliedFilters = { range: '30d' | '90d' | 'year' | 'custom'; status: 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded'; eventId: string; search: string; customFrom: string | null; customTo: string | null };

function resolveDateWindow(filters: AppliedFilters) {
	if (filters.range === 'custom') return { dateFrom: filters.customFrom, dateTo: filters.customTo };
	const dateTo = new Date();
	const dateFrom = new Date(dateTo);
	if (filters.range === '90d') dateFrom.setDate(dateFrom.getDate() - 89);
	else if (filters.range === 'year') dateFrom.setFullYear(dateFrom.getFullYear() - 1);
	else dateFrom.setDate(dateFrom.getDate() - 29);
	
return { dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() };
}

function mapTransactionRow(transaction: any): TransactionRow {
	const registration = transaction?.registration_id ?? {};
	
return {
		id: transaction?.id ?? '',
		date: transaction?.date_created ?? '',
		status: transaction?.status ?? 'pending',
		transactionId: transaction?.provider_object_id ?? transaction?.provider_event_id ?? '',
		eventTitle: registration?.event_id?.title ?? 'Evento não informado',
		participantName: registration?.participant_name ?? '—',
		participantEmail: registration?.participant_email ?? '',
		quantity: Number(registration?.quantity ?? 0),
		gross: Number(registration?.total_amount ?? transaction?.amount ?? 0),
		fee: Number(registration?.service_fee ?? 0),
		net: Number(registration?.payment_amount ?? 0),
		paymentStatus: registration?.payment_status ?? 'pending',
		paymentIntentId: registration?.provider_transaction_id ?? '',
	};
}

export async function fetchFinanceEvents(_organizer: OrganizerProfile, _accessToken: string): Promise<EventsOption[]> {
	const response = await authenticatedBackendFetch<{ data: EventsOption[] }>('/api/organizer/finance/events');
	
return response.data;
}

export async function fetchFinanceOverview(_organizer: OrganizerProfile, _accessToken: string, filters: AppliedFilters): Promise<OverviewMetrics> {
	const params = new URLSearchParams();
	const { dateFrom, dateTo } = resolveDateWindow(filters);
	if (dateFrom) params.set('date_from', dateFrom);
	if (dateTo) params.set('date_to', dateTo);
	const response = await authenticatedBackendFetch<{ metrics: OverviewMetrics }>(`/api/organizer/finance/overview?${params}`);
	
return response.metrics;
}

export async function fetchTransactions(
	_organizer: OrganizerProfile,
	_accessToken: string,
	filters: AppliedFilters,
	page = 1,
	limit = 20,
	_sortField = 'date',
	sortDirection: 'asc' | 'desc' = 'desc',
): Promise<TransactionsResult> {
	const params = new URLSearchParams({ page: String(page), limit: String(limit), sort_direction: sortDirection });
	const { dateFrom, dateTo } = resolveDateWindow(filters);
	if (dateFrom) params.set('date_from', dateFrom);
	if (dateTo) params.set('date_to', dateTo);
	if (filters.status !== 'all') params.set('status', filters.status);
	if (filters.eventId !== 'all') params.set('event_id', filters.eventId);
	if (filters.search) params.set('search', filters.search);
	const response = await authenticatedBackendFetch<{ data: unknown[]; pagination: PaginationState }>(`/api/organizer/finance/transactions?${params}`);
	
return { data: response.data.map(mapTransactionRow), pagination: response.pagination };
}

export async function fetchPayouts(_organizer: OrganizerProfile): Promise<PayoutSummary> {
	return authenticatedBackendFetch<PayoutSummary>('/api/organizer/finance/payouts');
}
