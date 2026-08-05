'use client';

import { memo } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import type { PaginationState, TransactionRow } from '@/lib/finance/server-fetchers';
import type { TransactionSort, TransactionSortField } from '@/lib/finance/api-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TransactionsTableProps {
	rows: TransactionRow[];
	isLoading: boolean;
	pagination: PaginationState;
	onPageChange: (page: number) => void;
	onSortChange: (sort: TransactionSort) => void;
	sort: TransactionSort;
	currencyFormatter: Intl.NumberFormat;
}

function formatDate(value: string) {
	if (!value) {

		return '—';
	}

	const date = new Date(value);

	return date.toLocaleString('pt-BR', {
		day: '2-digit',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

const statusStyles: Record<string, string> = {
	succeeded: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
	pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
	failed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
	refunded: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300',
};

function getStatusLabel(status: string) {
	switch (status) {
		case 'succeeded':
			return 'Pago';
		case 'pending':
			return 'Pendente';
		case 'failed':
			return 'Falhou';
		case 'refunded':
			return 'Reembolsado';
		default:
			return status ?? '—';
	}
}

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
	if (!active) {

		return (
			<span className="ml-1 inline-flex size-3 items-center justify-center text-gray-300 dark:text-gray-600">
				•
			</span>
		);
	}

	return direction === 'asc' ? (
		<ChevronUp className="ml-1 size-4 text-gray-500" />
	) : (
		<ChevronDown className="ml-1 size-4 text-gray-500" />
	);
}

function TransactionsTable({
	rows,
	isLoading,
	pagination,
	onPageChange,
	onSortChange,
	sort,
	currencyFormatter,
}: TransactionsTableProps) {
	const handleSort = (field: TransactionSortField) => {
		if (sort.field === field) {
			onSortChange({
				field,
				direction: sort.direction === 'asc' ? 'desc' : 'asc',
			});

			return;
		}

		onSortChange({ field, direction: 'desc' });
	};

	const nextDisabled = isLoading || pagination.page >= pagination.pageCount;
	const prevDisabled = isLoading || pagination.page <= 1;

	return (
		<div className="overflow-x-auto">
			<table className="min-w-full divide-y divide-gray-200 text-left text-sm dark:divide-gray-800">
				<thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500 dark:bg-gray-900 dark:text-gray-400">
					<tr>
						<th className="px-4 py-3 font-semibold">
							<button
								type="button"
								onClick={() => handleSort('date')}
								className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
							>
								Data
								<SortIcon active={sort.field === 'date'} direction={sort.direction} />
							</button>
						</th>
						<th className="px-4 py-3 font-semibold">ID Transação</th>
						<th className="px-4 py-3 font-semibold">Evento</th>
						<th className="px-4 py-3 font-semibold">Participante</th>
						<th className="px-4 py-3 font-semibold text-right">Qtd</th>
						<th className="px-4 py-3 font-semibold text-right">
							<button
								type="button"
								onClick={() => handleSort('gross')}
								className="inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
							>
								Valor Bruto
								<SortIcon active={sort.field === 'gross'} direction={sort.direction} />
							</button>
						</th>
						<th className="px-4 py-3 font-semibold text-right">
							<button
								type="button"
								onClick={() => handleSort('fee')}
								className="inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
							>
								Taxa
								<SortIcon active={sort.field === 'fee'} direction={sort.direction} />
							</button>
						</th>
						<th className="px-4 py-3 font-semibold text-right">
							<button
								type="button"
								onClick={() => handleSort('net')}
								className="inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
							>
								Valor Líquido
								<SortIcon active={sort.field === 'net'} direction={sort.direction} />
							</button>
						</th>
						<th className="px-4 py-3 font-semibold text-right">
							<button
								type="button"
								onClick={() => handleSort('status')}
								className="inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-gray-600 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
							>
								Status
								<SortIcon active={sort.field === 'status'} direction={sort.direction} />
							</button>
						</th>
					</tr>
				</thead>
				<tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-800 dark:bg-slate-900">
					{isLoading ? (
						<tr>
							<td colSpan={9} className="px-4 py-6 text-center text-gray-500">
								<div className="flex items-center justify-center gap-2 text-sm text-gray-500">
									<Loader2 className="size-4 animate-spin" />
									Carregando transações...
								</div>
							</td>
						</tr>
					) : rows.length === 0 ? (
						<tr>
							<td colSpan={9} className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
								Nenhuma transação encontrada para os filtros selecionados.
							</td>
						</tr>
					) : (
						rows.map((row) => (
							<tr key={row.id} className="transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/40">
								<td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
									{formatDate(row.date)}
								</td>
								<td className="px-4 py-3 text-xs font-medium text-purple-600 dark:text-purple-300">
									{row.transactionId || '—'}
								</td>
								<td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
									{row.eventTitle}
								</td>
								<td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
									<div className="flex flex-col">
										<span className="font-medium text-gray-800 dark:text-gray-100">
											{row.participantName}
										</span>
										<span className="text-xs text-gray-500 dark:text-gray-400">
											{row.participantEmail}
										</span>
									</div>
								</td>
								<td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
									{row.quantity}
								</td>
								<td className="px-4 py-3 text-right text-sm font-semibold text-gray-900 dark:text-white">
									{currencyFormatter.format(row.gross)}
								</td>
								<td className="px-4 py-3 text-right text-sm text-gray-700 dark:text-gray-200">
									{currencyFormatter.format(row.fee)}
								</td>
								<td className="px-4 py-3 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-300">
									{currencyFormatter.format(row.net)}
								</td>
								<td className="px-4 py-3 text-right">
									<Badge
										className={`ml-auto text-xs ${statusStyles[row.status] ?? 'bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-200'}`}
									>
										{getStatusLabel(row.status)}
									</Badge>
								</td>
							</tr>
						))
					)}
				</tbody>
			</table>
			{rows.length > 0 && !isLoading && (
				<div className="mt-4 flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
					<span>
						Exibindo página {pagination.page} de {Math.max(pagination.pageCount, 1)}
					</span>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							disabled={prevDisabled}
							onClick={() => onPageChange(pagination.page - 1)}
						>
							Anterior
						</Button>
						<Button
							variant="outline"
							size="sm"
							disabled={nextDisabled}
							onClick={() => onPageChange(pagination.page + 1)}
						>
							Próxima
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}

export default memo(TransactionsTable);
