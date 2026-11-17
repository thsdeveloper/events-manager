'use client';

import { useMemo, type ReactNode } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './data-table';

export interface TableRecord {
	id: string;
	cells: ReactNode[];
	/** Raw values keep numeric/date sorting independent of formatted cell content. */
	values?: (string | number | null)[];
}
interface RecordTableProps {
	headers: ReactNode[];
	rows: TableRecord[];
	paginate?: boolean;
	emptyMessage?: ReactNode;
}
/** Server components can provide rendered cells without shipping their formatters to the browser. */
export function RecordTable({ headers, rows, paginate = true, emptyMessage }: RecordTableProps) {
	const columns = useMemo<ColumnDef<TableRecord>[]>(
		() =>
			headers.map((header, index) => ({
				id: String(index),
				header: typeof header === 'string' ? header : () => header,
				accessorFn: (row) => row.values?.[index],
				enableSorting: rows.some((row) => row.values?.[index] != null),
				cell: ({ row }) => row.original.cells[index],
			})),
		[headers, rows],
	);

	return (
		<DataTable
			columns={columns}
			data={rows}
			showToolbar={false}
			paginate={paginate}
			emptyMessage={emptyMessage}
			getRowId={(row) => row.id}
		/>
	);
}
