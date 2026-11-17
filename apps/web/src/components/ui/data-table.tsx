'use client';

import * as React from 'react';
import {
	ColumnDef,
	ColumnFiltersState,
	SortingState,
	VisibilityState,
	flexRender,
	getCoreRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	useReactTable,
} from '@tanstack/react-table';
import { ArrowUpDown, ChevronDown } from 'lucide-react';

import { FilterSheet } from '@/components/shared/FilterSheet';
import { FilterInput } from '@/components/shared/FilterFields';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface DataTableProps<TData, TValue> {
	columns: ColumnDef<TData, TValue>[];
	data: TData[];
	searchKey?: string;
	searchPlaceholder?: string;
	paginate?: boolean;
	showToolbar?: boolean;
	emptyMessage?: React.ReactNode;
	getRowId?: (row: TData, index: number) => string;
	toolbar?: (table: ReturnType<typeof useReactTable<TData>>) => React.ReactNode;
}

export function DataTable<TData, TValue>({
	columns,
	data,
	searchKey,
	searchPlaceholder = 'Buscar...',
	toolbar,
	paginate = true,
	showToolbar = true,
	emptyMessage = 'Nenhum resultado encontrado.',
	getRowId,
}: DataTableProps<TData, TValue>) {
	const [sorting, setSorting] = React.useState<SortingState>([]);
	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
	const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
	const [rowSelection, setRowSelection] = React.useState({});

	const table = useReactTable({
		data,
		columns,
		onSortingChange: setSorting,
		onColumnFiltersChange: setColumnFilters,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: paginate ? getPaginationRowModel() : undefined,
		getRowId,
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onColumnVisibilityChange: setColumnVisibility,
		onRowSelectionChange: setRowSelection,
		state: {
			sorting,
			columnFilters,
			columnVisibility,
			rowSelection,
		},
	});

	return (
		<div className="w-full space-y-4">
			{showToolbar && (
				<div className="flex flex-wrap items-center justify-between gap-2">
					{toolbar ? (
						toolbar(table)
					) : (
						<div className="flex flex-1 items-center space-x-2">
							{searchKey && (
								<FilterSheet
									title="Filtros da tabela"
									values={{ search: (table.getColumn(searchKey)?.getFilterValue() as string) ?? '' }}
									defaultValues={{ search: '' }}
									activeCount={table.getColumn(searchKey)?.getFilterValue() ? 1 : 0}
									onApply={(draft) => {
										table.getColumn(searchKey)?.setFilterValue(draft.search);
										table.setPageIndex(0);
									}}
								>
									{(draft, setDraft) => (
										<FilterInput
											label={searchPlaceholder}
											placeholder={searchPlaceholder}
											value={draft.search}
											onChange={(event) => setDraft({ search: event.target.value })}
										/>
									)}
								</FilterSheet>
							)}
						</div>
					)}

					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="outline" className="ml-auto">
								Colunas <ChevronDown className="ml-2 size-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							{table
								.getAllColumns()
								.filter((column) => column.getCanHide())
								.map((column) => {
									return (
										<DropdownMenuCheckboxItem
											key={column.id}
											className="capitalize"
											checked={column.getIsVisible()}
											onCheckedChange={(value) => column.toggleVisibility(!!value)}
										>
											{column.id}
										</DropdownMenuCheckboxItem>
									);
								})}
						</DropdownMenuContent>
					</DropdownMenu>
				</div>
			)}

			<div className="rounded-md border">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow key={headerGroup.id}>
								{headerGroup.headers.map((header) => {
									return (
										<TableHead
											key={header.id}
											aria-sort={
												header.column.getIsSorted() === 'asc'
													? 'ascending'
													: header.column.getIsSorted() === 'desc'
														? 'descending'
														: undefined
											}
										>
											{header.isPlaceholder ? null : typeof header.column.columnDef.header === 'string' &&
											  header.column.getCanSort() ? (
												<Button
													variant="ghost"
													size="sm"
													aria-label={`Ordenar por ${header.column.columnDef.header}`}
													onClick={header.column.getToggleSortingHandler()}
												>
													{header.column.columnDef.header}
													<ArrowUpDown className="ml-2 size-4" aria-hidden="true" />
												</Button>
											) : (
												flexRender(header.column.columnDef.header, header.getContext())
											)}
										</TableHead>
									);
								})}
							</TableRow>
						))}
					</TableHeader>
					<TableBody>
						{table.getRowModel().rows?.length ? (
							table.getRowModel().rows.map((row) => (
								<TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
									{row.getVisibleCells().map((cell) => (
										<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
									))}
								</TableRow>
							))
						) : (
							<TableRow>
								<TableCell colSpan={columns.length} className="h-24 text-center">
									{emptyMessage}
								</TableCell>
							</TableRow>
						)}
					</TableBody>
				</Table>
			</div>

			{paginate && (
				<div className="flex flex-wrap items-center justify-between gap-4 px-2">
					<div className="flex-1 text-sm text-muted-foreground">
						{table.getFilteredSelectedRowModel().rows.length > 0 && (
							<span>
								{table.getFilteredSelectedRowModel().rows.length} de {table.getFilteredRowModel().rows.length} linha(s)
								selecionada(s).
							</span>
						)}
					</div>
					<div className="flex flex-wrap items-center gap-4">
						<div className="flex items-center space-x-2">
							<p className="text-sm font-medium">Linhas por página</p>
							<NativeSelect
								aria-label="Linhas por página"
								value={table.getState().pagination.pageSize}
								onChange={(e) => {
									table.setPageSize(Number(e.target.value));
								}}
								className="h-8 w-[70px] rounded-md border border-input bg-background px-2 py-1 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
							>
								{[10, 20, 30, 40, 50].map((pageSize) => (
									<option key={pageSize} value={pageSize}>
										{pageSize}
									</option>
								))}
							</NativeSelect>
						</div>
						<div className="flex w-[100px] items-center justify-center text-sm font-medium">
							Página {table.getState().pagination.pageIndex + 1} de {Math.max(1, table.getPageCount())}
						</div>
						<div className="flex items-center space-x-2">
							<Button
								variant="outline"
								size="sm"
								onClick={() => table.previousPage()}
								disabled={!table.getCanPreviousPage()}
							>
								Anterior
							</Button>
							<Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
								Próxima
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
