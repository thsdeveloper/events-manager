'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type {
	AppliedFilters,
	OverviewMetrics,
	PaginationState,
	PayoutSummary,
	TransactionsResult,
} from '@/lib/finance/server-fetchers';
import {
	fetchFinanceOverview,
	fetchPayouts,
	fetchTransactions,
	type TransactionSort,
} from '@/lib/finance/api-client';

type QueryPagination = Pick<PaginationState, 'page' | 'limit'>;

type FinanceOverviewOptions = {
	initialData?: OverviewMetrics;
	enabled?: boolean;
};

type FinanceTransactionsOptions = {
	initialData?: TransactionsResult;
};

type FinancePayoutsOptions = {
	initialData?: PayoutSummary;
	enabled?: boolean;
};

export function useFinanceOverview(filters: AppliedFilters, options: FinanceOverviewOptions = {}) {
	const { initialData, enabled = true } = options;

	return useQuery({
		queryKey: ['finance', 'overview', filters],
		queryFn: ({ signal }) => fetchFinanceOverview(filters, signal),
		staleTime: 30 * 1000,
		initialData,
		enabled,
	});
}

export function useTransactions(
	filters: AppliedFilters,
	pagination: QueryPagination,
	sort: TransactionSort,
	options: FinanceTransactionsOptions = {},
) {
	const { initialData } = options;

	return useQuery({
		queryKey: ['finance', 'transactions', filters, pagination, sort],
		queryFn: ({ signal }) => fetchTransactions(filters, pagination, sort, signal),
		initialData,
		placeholderData: keepPreviousData,
	});
}

export function usePayouts(options: FinancePayoutsOptions = {}) {
	const { initialData, enabled = true } = options;

	return useQuery({
		queryKey: ['finance', 'payouts'],
		queryFn: ({ signal }) => fetchPayouts(signal),
		initialData,
		enabled,
		placeholderData: keepPreviousData,
	});
}
