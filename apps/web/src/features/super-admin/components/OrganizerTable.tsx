'use client';
import { usePlatformPermissions } from '@/features/platform-access/PlatformPermissions';
import type { OrganizerAdminList, OrganizerAdminQuery } from '@events-manager/contracts';
import type { ColumnDef, PaginationState, SortingState, Updater } from '@tanstack/react-table';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/formatters';
import { organizerStatusLabels, payoutStatusLabels, supportDate } from '../lib/organizer-labels';

type OrganizerRow = OrganizerAdminList['data'][number];
const columns: ColumnDef<OrganizerRow>[] = [
	{
		accessorKey: 'name',
		header: 'Organizador',
		enableHiding: false,
		cell: ({ row }) => (
			<div className="min-w-52">
				<Link
					href={`/super-admin/organizadores/${row.original.id}`}
					className="font-semibold text-primary hover:underline"
				>
					{row.original.name}
				</Link>
				<p className="mt-1 text-xs text-muted-foreground">{row.original.email}</p>
				<p className="mt-1 text-xs text-muted-foreground">{row.original.document || 'Documento não informado'}</p>
			</div>
		),
	},
	{
		accessorKey: 'status',
		header: 'Status',
		cell: ({ row }) => (
			<Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
				{organizerStatusLabels[row.original.status]}
			</Badge>
		),
	},
	{
		accessorKey: 'payout_status',
		header: 'Recebimento',
		cell: ({ row }) => payoutStatusLabels[row.original.payout_status],
	},
	{ id: 'eventos', header: 'Eventos', enableSorting: false, accessorFn: (row) => row.metrics.events },
	{ id: 'ingressos', header: 'Ingressos vendidos', enableSorting: false, accessorFn: (row) => row.metrics.ticketsSold },
	{
		id: 'receita',
		header: 'Receita bruta',
		enableSorting: false,
		cell: ({ row }) => formatCurrency(row.original.metrics.grossRevenue),
	},
	{ accessorKey: 'date_created', header: 'Cadastro', cell: ({ row }) => supportDate(row.original.date_created) },
	{
		id: 'atendimento',
		header: 'Atendimento',
		enableHiding: false,
		enableSorting: false,
		cell: ({ row }) => (
			<Button asChild variant="outline" size="sm">
				<Link href={`/super-admin/organizadores/${row.original.id}`}>Ver detalhes</Link>
			</Button>
		),
	},
];
function resolve<T>(updater: Updater<T>, previous: T): T {
	return typeof updater === 'function' ? (updater as (value: T) => T)(previous) : updater;
}
export function OrganizerTable({ result, query }: { result: OrganizerAdminList; query: OrganizerAdminQuery }) {
	const { can } = usePlatformPermissions();
	const visibleColumns = can('platform_finance.read')
		? columns
		: columns.filter((c) => !['ingressos', 'receita'].includes(c.id ?? ''));
	const router = useRouter();
	const [pending, startTransition] = useTransition();
	const [search, setSearch] = useState(query.search);
	const [status, setStatus] = useState(query.status ?? '');
	const pagination = { pageIndex: result.pagination.page - 1, pageSize: result.pagination.limit };
	const sorting: SortingState = [{ id: query.sort, desc: query.direction === 'desc' }];
	function navigate(patch: Partial<OrganizerAdminQuery>) {
		const next = { ...query, ...patch };
		const params = new URLSearchParams();
		for (const [key, value] of Object.entries(next))
			if (value !== undefined && value !== '') params.set(key, String(value));
		startTransition(() => router.push(`/super-admin/organizadores?${params}`));
	}

	return (
		<Card className="space-y-5 p-4 sm:p-6" aria-busy={pending}>
			<form
				className="flex flex-wrap items-end gap-3"
				aria-label="Filtros de organizadores"
				onSubmit={(event) => {
					event.preventDefault();
					navigate({ search, status: (status as OrganizerAdminQuery['status']) || undefined, page: 1 });
				}}
			>
				<Label className="min-w-48 flex-1 space-y-2 text-sm font-medium">
					Buscar organizadores
					<Input
						value={search}
						onChange={(event) => setSearch(event.target.value)}
						placeholder="Nome, e-mail ou CPF/CNPJ"
					/>
				</Label>
				<Label className="space-y-2 text-sm font-medium">
					Status
					<NativeSelect value={status} onChange={(event) => setStatus(event.target.value)}>
						<option value="">Todos</option>
						{Object.entries(organizerStatusLabels).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</NativeSelect>
				</Label>
				<Button type="submit" disabled={pending}>
					Aplicar filtros
				</Button>
				<Button
					type="button"
					variant="ghost"
					disabled={pending}
					onClick={() => {
						setSearch('');
						setStatus('');
						navigate({ search: '', status: undefined, page: 1 });
					}}
				>
					Limpar
				</Button>
			</form>
			<p className="text-sm text-muted-foreground">
				{result.pagination.total} organizador(es). Selecione uma conta para consultar dados e registrar o atendimento.
			</p>
			<DataTable
				columns={visibleColumns}
				data={result.data}
				getRowId={(row) => row.id}
				emptyMessage="Nenhum organizador encontrado."
				serverPagination={{
					state: pagination,
					rowCount: result.pagination.total,
					onChange: (updater) => {
						const next = resolve<PaginationState>(updater, pagination);
						navigate({ page: next.pageSize === pagination.pageSize ? next.pageIndex + 1 : 1, limit: next.pageSize });
					},
				}}
				serverSorting={{
					state: sorting,
					onChange: (updater) => {
						const next = resolve<SortingState>(updater, sorting)[0];
						navigate({
							sort: (next?.id ?? 'date_created') as OrganizerAdminQuery['sort'],
							direction: next?.desc ? 'desc' : 'asc',
							page: 1,
						});
					},
				}}
			/>
		</Card>
	);
}
