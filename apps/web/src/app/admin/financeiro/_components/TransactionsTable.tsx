'use client';

import { RecordTable } from '@/components/ui/record-table';

import { Spinner } from '@/components/ui/spinner';
import { memo, useState } from 'react';
import { ChevronDown, ChevronUp, Receipt } from 'lucide-react';
import type { PaginationState, TransactionRow } from '@/lib/finance/server-fetchers';
import type { TransactionSort, TransactionSortField } from '@/lib/finance/api-client';
import { Button } from '@/components/ui/button';
import { TransactionStatusBadge } from '@/features/finance/components/TransactionStatusBadge';
import { TransactionDetailsSheet } from '@/features/finance/components/TransactionDetailsSheet';
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia } from '@/components/ui/empty';

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

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
	if (!active) {
		return (
			<span className="ml-1 inline-flex size-3 items-center justify-center text-muted-foreground dark:text-muted-foreground">
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
	const [selectedId, setSelectedId] = useState<string | null>(null);
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
			<RecordTable
				onRowClick={(row) => setSelectedId(row.id)}
				headers={[
					<>
						<Button
							variant="ghost"
							type="button"
							onClick={() => handleSort('date')}
							className="h-auto whitespace-normal inline-flex items-center uppercase tracking-wider"
						>
							Data
							<SortIcon active={sort.field === 'date'} direction={sort.direction} />
						</Button>
					</>,
					'ID Transação',
					'Evento',
					'Participante',
					'Qtd',
					<>
						<Button
							variant="ghost"
							type="button"
							onClick={() => handleSort('gross')}
							className="h-auto whitespace-normal inline-flex items-center justify-end uppercase tracking-wider"
						>
							Valor Bruto
							<SortIcon active={sort.field === 'gross'} direction={sort.direction} />
						</Button>
					</>,
					<>
						<Button
							variant="ghost"
							type="button"
							onClick={() => handleSort('fee')}
							className="h-auto whitespace-normal inline-flex items-center justify-end uppercase tracking-wider"
						>
							Taxa
							<SortIcon active={sort.field === 'fee'} direction={sort.direction} />
						</Button>
					</>,
					<>
						<Button
							variant="ghost"
							type="button"
							onClick={() => handleSort('net')}
							className="h-auto whitespace-normal inline-flex items-center justify-end uppercase tracking-wider"
						>
							Valor Líquido
							<SortIcon active={sort.field === 'net'} direction={sort.direction} />
						</Button>
					</>,
					<>
						<Button
							variant="ghost"
							type="button"
							onClick={() => handleSort('status')}
							className="h-auto whitespace-normal inline-flex items-center justify-end uppercase tracking-wider"
						>
							Status
							<SortIcon active={sort.field === 'status'} direction={sort.direction} />
						</Button>
					</>,
				]}
				rows={
					isLoading
						? []
						: rows.map((row) => ({
								id: String(row.id),
								cells: [
									<div key="column-0" className="text-sm text-foreground">
										{formatDate(row.date)}
									</div>,
									<Button
										key="column-1"
										variant="link"
										className="h-auto max-w-56 justify-start whitespace-normal break-all p-0 text-left"
										aria-label={`Ver detalhes da transação ${row.transactionId || row.id}`}
										onClick={() => setSelectedId(row.id)}
									>
										{row.transactionId || row.id}
									</Button>,
									<div key="column-2" className="text-sm text-foreground">
										{row.eventTitle}
									</div>,
									<div key="column-3" className="text-sm text-muted-foreground">
										<div className="flex flex-col">
											<span className="font-medium text-foreground">{row.participantName}</span>
											<span className="text-xs text-muted-foreground dark:text-muted-foreground">
												{row.participantEmail}
											</span>
										</div>
									</div>,
									<div key="column-4" className="text-right text-sm text-foreground">
										{row.quantity}
									</div>,
									<div key="column-5" className="text-right text-sm text-foreground">
										{currencyFormatter.format(row.gross)}
									</div>,
									<div key="column-6" className="text-right text-sm text-foreground">
										{row.fee == null ? 'A confirmar' : currencyFormatter.format(row.fee)}
									</div>,
									<div key="column-7" className="text-right text-sm text-muted-foreground ">
										{row.net == null ? 'A confirmar' : currencyFormatter.format(row.net)}
									</div>,
									<div key="column-8" className="text-right">
										<TransactionStatusBadge status={row.status} />
									</div>,
								],
							}))
				}
				paginate={false}
				emptyMessage={
					isLoading ? (
						<>
							<div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
								<Spinner className="size-4 animate-spin" />
								Carregando transações...
							</div>
						</>
					) : (
						<>
							<Empty>
								<EmptyHeader>
									<EmptyMedia variant="icon">
										<Receipt aria-hidden="true" />
									</EmptyMedia>
									<EmptyDescription>Nenhuma transação encontrada para os filtros selecionados.</EmptyDescription>
								</EmptyHeader>
							</Empty>
						</>
					)
				}
			/>
			{rows.length > 0 && !isLoading && (
				<div className="mt-4 flex items-center justify-between text-sm text-muted-foreground dark:text-muted-foreground">
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
			{selectedId ? <TransactionDetailsSheet transactionId={selectedId} onClose={() => setSelectedId(null)} /> : null}
		</div>
	);
}

export default memo(TransactionsTable);
