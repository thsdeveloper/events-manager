'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import type { OrganizerProfile } from '@/lib/auth/server-auth';
import type {
	AppliedFilters,
	EventsOption,
	OverviewMetrics,
	PaginationState,
	PayoutSummary,
	TransactionsResult,
} from '@/lib/finance/server-fetchers';
import {
	resolveDateWindow,
	type TransactionSort,
} from '@/lib/finance/api-client';
import { useFinanceOverview, usePayouts, useTransactions } from '@/hooks/queries/useFinanceData';
import FinanceOverview from './FinanceOverview';
import FinanceFilters, { type FiltersDraft } from './FinanceFilters';
import PayoutHistory from './PayoutHistory';
import PaymentAccountStatus from './PaymentAccountStatus';
import TransactionsTable from './TransactionsTable';

const DEFAULT_PAGINATION: PaginationState = {
	page: 1,
	limit: 20,
	total: 0,
	pageCount: 0,
};

const defaultFilters: AppliedFilters = {
	range: '30d',
	status: 'all',
	eventId: 'all',
	search: '',
	customFrom: null,
	customTo: null,
};

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
	style: 'currency',
	currency: 'BRL',
});

function areFiltersEqual(a: AppliedFilters, b: AppliedFilters) {
	return (
		a.range === b.range &&
		a.status === b.status &&
		a.eventId === b.eventId &&
		a.search === b.search &&
		a.customFrom === b.customFrom &&
		a.customTo === b.customTo
	);
}

function buildExportPayload(filters: AppliedFilters) {
	const { dateFrom, dateTo } = resolveDateWindow(filters);

	return {
		format: 'csv',
		status: filters.status !== 'all' ? filters.status : undefined,
		event_id: filters.eventId !== 'all' ? filters.eventId : undefined,
		search: filters.search || undefined,
		date_from: dateFrom ?? undefined,
		date_to: dateTo ?? undefined,
	};
}

interface FinanceiroDashboardProps {
	organizer: OrganizerProfile;
	initialEvents: EventsOption[];
	initialOverview: OverviewMetrics;
	initialTransactions: TransactionsResult;
	initialPayouts: PayoutSummary;
}

export default function FinanceiroDashboard({
	organizer,
	initialEvents,
	initialOverview,
	initialTransactions,
	initialPayouts,
}: FinanceiroDashboardProps) {
	const [filters, setFilters] = useState<AppliedFilters>(defaultFilters);
	const [paginationState, setPaginationState] = useState<Pick<PaginationState, 'page' | 'limit'>>({
		page: initialTransactions.pagination?.page ?? DEFAULT_PAGINATION.page,
		limit: initialTransactions.pagination?.limit ?? DEFAULT_PAGINATION.limit,
	});
	const [sortState, setSortState] = useState<TransactionSort>({
		field: 'date',
		direction: 'desc',
	});
	const [exporting, setExporting] = useState(false);
	const [exportError, setExportError] = useState<string | null>(null);
	const isDefaultFilterSelection = useMemo(
		() => areFiltersEqual(filters, defaultFilters),
		[filters],
	);
	const isDefaultQueryState =
		isDefaultFilterSelection &&
		paginationState.page === (initialTransactions.pagination?.page ?? DEFAULT_PAGINATION.page) &&
		paginationState.limit === (initialTransactions.pagination?.limit ?? DEFAULT_PAGINATION.limit) &&
		sortState.field === 'date' &&
		sortState.direction === 'desc';

	const overviewQuery = useFinanceOverview(filters, {
		initialData: isDefaultFilterSelection ? initialOverview : undefined,
	});

	const transactionsQuery = useTransactions(filters, paginationState, sortState, {
		initialData: isDefaultQueryState ? initialTransactions : undefined,
	});

	const payoutsQuery = usePayouts({
		initialData: initialPayouts,
	});

	const overviewLoading = overviewQuery.isPending || overviewQuery.isFetching;
	const transactionsLoading = transactionsQuery.isPending || transactionsQuery.isFetching;
	const payoutLoading = payoutsQuery.isPending || payoutsQuery.isFetching;

	const metrics = overviewQuery.data ?? null;
	const transactions = transactionsQuery.data?.data ?? [];
	const pagination = transactionsQuery.data?.pagination ?? {
		page: paginationState.page,
		limit: paginationState.limit,
		total: 0,
		pageCount: 0,
	};
	const payoutSummary = payoutsQuery.data ?? null;

	const transactionsErrorMessage = transactionsQuery.isError
		? transactionsQuery.error instanceof Error
			? transactionsQuery.error.message
			: 'Erro ao carregar transações'
		: null;

	const globalError = exportError ?? transactionsErrorMessage;

	const handleFiltersApply = useCallback((draft: FiltersDraft) => {
		setFilters({
			range: draft.range,
			status: draft.status,
			eventId: draft.eventId,
			search: draft.search,
			customFrom: draft.customFrom,
			customTo: draft.customTo,
		});
		setExportError(null);
		setPaginationState((prev) => ({ ...prev, page: 1 }));
	}, []);

	const handlePageChange = useCallback((page: number) => {
		setExportError(null);
		setPaginationState((prev) => ({ ...prev, page }));
	}, []);

	const handleSortChange = useCallback((sort: TransactionSort) => {
		setSortState(sort);
		setExportError(null);
		setPaginationState((prev) => ({ ...prev, page: 1 }));
	}, []);

	const handleExport = useCallback(async () => {
		try {
			setExportError(null);
			setExporting(true);
			const payload = buildExportPayload(filters);
			const response = await fetch('/api/organizer/finance/export', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				const errorPayload = await response.json().catch(() => ({}));
				throw new Error((errorPayload as { error?: string })?.error ?? 'Falha ao exportar CSV');
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const link = document.createElement('a');
			link.href = url;
			link.download = `financeiro-transacoes-${new Date()
				.toISOString()
				.replace(/[:.]/g, '-')}.csv`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error('Erro ao exportar CSV:', error);
			const message = error instanceof Error ? error.message : 'Erro ao exportar dados';
			setExportError(message);
		} finally {
			setExporting(false);
		}
	}, [filters]);

	const loadPayouts = useCallback(async () => {
		const result = await payoutsQuery.refetch();

		if (result.error) {
			console.error('Erro ao carregar repasses:', result.error);
		}
	}, [payoutsQuery]);

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-3xl font-bold text-gray-900 dark:text-white">
						Financeiro
					</h1>
					<p className="text-gray-600 dark:text-gray-400">
						Acompanhe vendas, taxas e repasses dos seus eventos
					</p>
				</div>
				<div className="flex flex-wrap gap-2">
					<Button
						variant="outline"
						onClick={loadPayouts}
						disabled={payoutLoading}
					>
						<RefreshCcw className="mr-2 size-4" />
						Atualizar repasses
					</Button>
					<Button onClick={handleExport} disabled={exporting}>
						<Download className="mr-2 size-4" />
						Exportar CSV
					</Button>
				</div>
			</div>

			<FinanceFilters
				events={initialEvents}
				filters={filters}
				onApply={handleFiltersApply}
			/>

			<PaymentAccountStatus organizer={organizer} payoutSummary={payoutSummary} />

			<FinanceOverview
				isLoading={overviewLoading}
				metrics={metrics}
				currencyFormatter={currencyFormatter}
			/>

			<Card className="border border-gray-200 shadow-sm dark:border-gray-800">
				<CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
					<div>
						<CardTitle>Transações</CardTitle>
						<CardDescription>
							Vendas e pagamentos processados pelos seus eventos
						</CardDescription>
					</div>
				</CardHeader>
				<CardContent>
					{globalError && (
						<div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
							{globalError}
						</div>
					)}
					<TransactionsTable
						rows={transactions}
						isLoading={transactionsLoading}
						pagination={pagination}
						onPageChange={handlePageChange}
						onSortChange={handleSortChange}
						sort={sortState}
						currencyFormatter={currencyFormatter}
					/>
				</CardContent>
			</Card>

			<PayoutHistory
				isLoading={payoutLoading}
				summary={payoutSummary}
				currencyFormatter={currencyFormatter}
			/>
		</div>
	);
}
