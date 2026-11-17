'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { TransactionSort, TransactionSortField } from '@/lib/finance/api-client';
import type { PaginationState, TransactionRow } from '@/lib/finance/server-fetchers';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { memo } from 'react';

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
			<span className="ml-1 inline-flex size-3 items-center justify-center text-gray-300 dark:text-muted-foreground">
				•
			</span>
		);
	}

	return direction === 'asc' ? (
		<ChevronUp className="ml-1 size-4 text-muted-foreground" />
	) : (
		<ChevronDown className="ml-1 size-4 text-muted-foreground" />
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
			<Table className="min-w-full divide-y divide-border text-left text-sm ">
				<TableHeader className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground  ">
					<TableRow>
						<TableHead className="px-4 py-3 font-semibold">
							<Button
								variant="ghost"
								type="button"
								onClick={() => handleSort('date')}
								className="h-auto whitespace-normal inline-flex items-center text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground  dark:hover:text-white"
							>
								Data
								<SortIcon active={sort.field === 'date'} direction={sort.direction} />
							</Button>
						</TableHead>
						<TableHead className="px-4 py-3 font-semibold">ID Transação</TableHead>
						<TableHead className="px-4 py-3 font-semibold">Evento</TableHead>
						<TableHead className="px-4 py-3 font-semibold">Participante</TableHead>
						<TableHead className="px-4 py-3 font-semibold text-right">Qtd</TableHead>
						<TableHead className="px-4 py-3 font-semibold text-right">
							<Button
								variant="ghost"
								type="button"
								onClick={() => handleSort('gross')}
								className="h-auto whitespace-normal inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground  dark:hover:text-white"
							>
								Valor Bruto
								<SortIcon active={sort.field === 'gross'} direction={sort.direction} />
							</Button>
						</TableHead>
						<TableHead className="px-4 py-3 font-semibold text-right">
							<Button
								variant="ghost"
								type="button"
								onClick={() => handleSort('fee')}
								className="h-auto whitespace-normal inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground  dark:hover:text-white"
							>
								Taxa
								<SortIcon active={sort.field === 'fee'} direction={sort.direction} />
							</Button>
						</TableHead>
						<TableHead className="px-4 py-3 font-semibold text-right">
							<Button
								variant="ghost"
								type="button"
								onClick={() => handleSort('net')}
								className="h-auto whitespace-normal inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground  dark:hover:text-white"
							>
								Valor Líquido
								<SortIcon active={sort.field === 'net'} direction={sort.direction} />
							</Button>
						</TableHead>
						<TableHead className="px-4 py-3 font-semibold text-right">
							<Button
								variant="ghost"
								type="button"
								onClick={() => handleSort('status')}
								className="h-auto whitespace-normal inline-flex items-center justify-end text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground  dark:hover:text-white"
							>
								Status
								<SortIcon active={sort.field === 'status'} direction={sort.direction} />
							</Button>
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody className="divide-y divide-border bg-card  ">
					{isLoading ? (
						<TableRow>
							<TableCell colSpan={9} className="px-4 py-6 text-center text-muted-foreground">
								<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="size-4 animate-spin" />
									Carregando transações...
								</div>
							</TableCell>
						</TableRow>
					) : rows.length === 0 ? (
						<TableRow>
							<TableCell colSpan={9} className="px-4 py-10 text-center text-muted-foreground ">
								Nenhuma transação encontrada para os filtros selecionados.
							</TableCell>
						</TableRow>
					) : (
						rows.map((row) => (
							<TableRow key={row.id} className="transition-colors hover:bg-muted/40 dark:hover:bg-gray-800/40">
								<TableCell className="px-4 py-3 text-sm text-foreground dark:text-gray-200">
									{formatDate(row.date)}
								</TableCell>
								<TableCell className="px-4 py-3 text-xs font-medium text-purple-600 dark:text-purple-300">
									{row.transactionId || '—'}
								</TableCell>
								<TableCell className="px-4 py-3 text-sm font-semibold text-foreground ">{row.eventTitle}</TableCell>
								<TableCell className="px-4 py-3 text-sm text-muted-foreground ">
									<div className="flex flex-col">
										<span className="font-medium text-gray-800 dark:text-gray-100">{row.participantName}</span>
										<span className="text-xs text-muted-foreground ">{row.participantEmail}</span>
									</div>
								</TableCell>
								<TableCell className="px-4 py-3 text-right text-sm font-semibold text-foreground ">
									{row.quantity}
								</TableCell>
								<TableCell className="px-4 py-3 text-right text-sm font-semibold text-foreground ">
									{currencyFormatter.format(row.gross)}
								</TableCell>
								<TableCell className="px-4 py-3 text-right text-sm text-foreground dark:text-gray-200">
									{currencyFormatter.format(row.fee)}
								</TableCell>
								<TableCell className="px-4 py-3 text-right text-sm font-semibold text-emerald-600 dark:text-emerald-300">
									{currencyFormatter.format(row.net)}
								</TableCell>
								<TableCell className="px-4 py-3 text-right">
									<Badge
										className={`ml-auto text-xs ${statusStyles[row.status] ?? 'bg-muted text-foreground  dark:text-gray-200'}`}
									>
										{getStatusLabel(row.status)}
									</Badge>
								</TableCell>
							</TableRow>
						))
					)}
				</TableBody>
			</Table>
			{rows.length > 0 && !isLoading && (
				<div className="mt-4 flex items-center justify-between text-sm text-muted-foreground ">
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
