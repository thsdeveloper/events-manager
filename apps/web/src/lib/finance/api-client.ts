'use client';

import type {
	AppliedFilters,
	OverviewMetrics,
	PaginationState,
	PayoutSummary,
	TransactionRow,
	TransactionsResult,
} from '@/lib/finance/server-fetchers';

export type TransactionSortField = 'date' | 'status' | 'gross' | 'fee' | 'net';

export type TransactionSort = {
	field: TransactionSortField;
	direction: 'asc' | 'desc';
};

const DEFAULT_PAGINATION: PaginationState = {
	page: 1,
	limit: 20,
	total: 0,
	pageCount: 0,
};

type FinanceOverviewResponse = {
	metrics: OverviewMetrics;
};

type TransactionsResponse = {
	data: unknown[];
	pagination?: PaginationState;
};

function isAbortError(error: unknown) {
	return error instanceof DOMException && error.name === 'AbortError';
}

async function fetchJson<T>(input: RequestInfo, init: RequestInit = {}): Promise<T> {
	const response = await fetch(input, init);

	if (!response.ok) {
		let message = 'Erro ao processar requisição';

		try {
			const errorPayload = (await response.json()) as { error?: string };
			message = errorPayload?.error ?? message;
		} catch {
			// noop
		}

		throw new Error(message);
	}

	return response.json() as Promise<T>;
}

export function resolveDateWindow(filters: AppliedFilters) {
	if (filters.range === 'custom') {
		return {
			dateFrom: filters.customFrom,
			dateTo: filters.customTo,
		};
	}

	const now = new Date();
	const to = now.toISOString();
	const from = new Date(now);

	switch (filters.range) {
		case '90d':
			from.setDate(from.getDate() - 89);
			break;
		case 'year':
			from.setFullYear(from.getFullYear() - 1);
			from.setDate(from.getDate() + 1);
			break;
		case '30d':
		default:
			from.setDate(from.getDate() - 29);
			break;
	}

	return {
		dateFrom: from.toISOString(),
		dateTo: to,
	};
}

export async function fetchFinanceOverview(filters: AppliedFilters, signal?: AbortSignal) {
	const params = new URLSearchParams();
	const { dateFrom, dateTo } = resolveDateWindow(filters);

	params.set('range', filters.range);

	if (dateFrom) {
		params.set('date_from', dateFrom);
	}

	if (dateTo) {
		params.set('date_to', dateTo);
	}

	try {
		const data = await fetchJson<FinanceOverviewResponse>(`/api/organizer/finance/overview?${params}`, {
			signal,
		});

		return data.metrics;
	} catch (error) {
		if (isAbortError(error)) {
			throw error;
		}

		throw error instanceof Error ? error : new Error('Erro ao carregar overview financeiro');
	}
}

function mapTransactionRow(transaction: any): TransactionRow {
	const registration = transaction?.registration_id ?? {};
	const event = registration?.event_id ?? {};

	return {
		id: transaction?.id ?? '',
		date: transaction?.date_created ?? '',
		status: transaction?.status ?? 'pending',
		transactionId: transaction?.provider_object_id ?? transaction?.provider_event_id ?? '',
		eventTitle: event?.title ?? 'Evento não informado',
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

export async function fetchTransactions(
	filters: AppliedFilters,
	pagination: Pick<PaginationState, 'page' | 'limit'>,
	sort: TransactionSort,
	signal?: AbortSignal,
): Promise<TransactionsResult> {
	const params = new URLSearchParams();
	const { dateFrom, dateTo } = resolveDateWindow(filters);

	params.set('page', String(pagination.page));
	params.set('limit', String(pagination.limit));
	params.set('sort_field', sort.field);
	params.set('sort_direction', sort.direction);

	if (filters.status !== 'all') {
		params.set('status', filters.status);
	}

	if (filters.eventId !== 'all') {
		params.set('event_id', filters.eventId);
	}

	if (filters.search) {
		params.set('search', filters.search);
	}

	if (dateFrom) {
		params.set('date_from', dateFrom);
	}

	if (dateTo) {
		params.set('date_to', dateTo);
	}

	try {
		const data = await fetchJson<TransactionsResponse>(
			`/api/organizer/finance/transactions?${params.toString()}`,
			{
				signal,
			},
		);

		return {
			data: (data.data ?? []).map(mapTransactionRow),
			pagination: data.pagination ?? DEFAULT_PAGINATION,
		};
	} catch (error) {
		if (isAbortError(error)) {
			throw error;
		}

		throw error instanceof Error ? error : new Error('Erro ao carregar transações financeiras');
	}
}

export async function fetchPayouts(signal?: AbortSignal): Promise<PayoutSummary> {
	try {
		return await fetchJson<PayoutSummary>('/api/organizer/finance/payouts', { signal });
	} catch (error) {
		if (isAbortError(error)) {
			throw error;
		}

		throw error instanceof Error ? error : new Error('Erro ao carregar repasses');
	}
}
