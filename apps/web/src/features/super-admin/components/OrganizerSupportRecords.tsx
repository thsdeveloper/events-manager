'use client';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef, PaginationState } from '@tanstack/react-table';
import type { OrganizerRecordQuery, OrganizerSupportRecords as Records } from '@events-manager/contracts';
import { useState } from 'react';
import Link from 'next/link';
import { DataTable } from '@/components/ui/data-table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/formatters';
import { organizerRequest } from '../api/organizer-support';
import { supportDate, supportFieldLabels, supportValue } from '../lib/organizer-labels';
type Row = Record<string, unknown>;
function record(value: unknown): Row {
	return value && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : {};
}
function money(value: unknown) {
	return formatCurrency(Number(value ?? 0));
}
function safeUrl(value: unknown) {
	return typeof value === 'string' && /^https?:\/\//i.test(value) ? value : null;
}
function Changes({ row }: { row: Row }) {
	const before = record(row.before_data),
		after = record(row.after_data);
	if (after.note) return <p className="max-w-xl whitespace-pre-wrap break-words">{String(after.note)}</p>;
	const fields = Object.keys(supportFieldLabels).filter(
		(key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
	);

	return (
		<div className="max-w-xl space-y-2">
			<p>{String(row.reason ?? 'Alteração administrativa')}</p>
			{fields.length > 0 && (
				<Collapsible>
					<CollapsibleTrigger asChild>
						<Button variant="link" className="h-auto p-0">
							Ver alterações
						</Button>
					</CollapsibleTrigger>
					<CollapsibleContent>
						<dl className="mt-2 space-y-2">
							{fields.map((key) => (
								<div key={key}>
									<dt className="font-medium">{supportFieldLabels[key]}</dt>
									<dd className="break-words text-muted-foreground">
										{supportValue(before[key])} → {supportValue(after[key])}
									</dd>
								</div>
							))}
						</dl>
					</CollapsibleContent>
				</Collapsible>
			)}
		</div>
	);
}
const columnsByKind: Record<OrganizerRecordQuery['kind'], ColumnDef<Row>[]> = {
	events: [
		{
			accessorKey: 'title',
			header: 'Evento',
			cell: ({ row }) => (
				<div className="min-w-48">
					<p className="font-medium">{String(row.original.title)}</p>
					<p className="mt-1 break-all text-xs text-muted-foreground">{String(row.original.id)}</p>
					{row.original.status === 'published' && Boolean(row.original.slug) && (
						<Link href={`/eventos/${row.original.slug}`} target="_blank" className="text-xs text-primary underline">
							Ver página do evento
						</Link>
					)}
				</div>
			),
		},
		{ accessorKey: 'status', header: 'Status', cell: ({ getValue }) => supportValue(getValue()) },
		{ accessorKey: 'start_date', header: 'Início', cell: ({ getValue }) => supportDate(getValue()) },
		{ accessorKey: 'location_name', header: 'Local', cell: ({ getValue }) => supportValue(getValue()) },
		{ accessorKey: 'registrations', header: 'Inscrições' },
	],
	transactions: [
		{
			accessorKey: 'id',
			header: 'Transação',
			cell: ({ row }) => (
				<div className="min-w-52">
					<p className="break-all text-xs">{String(row.original.id)}</p>
					<p className="mt-1 font-medium">{String(row.original.event_title)}</p>
					<p className="text-xs text-muted-foreground">{String(row.original.participant_name ?? '')}</p>
					<p className="text-xs text-muted-foreground">Pedido: {String(row.original.registration_id)}</p>
					<p className="text-xs text-muted-foreground">
						{String(row.original.provider)} · {String(row.original.provider_object_id ?? 'Sem referência externa')}
					</p>
				</div>
			),
		},
		{ accessorKey: 'status', header: 'Situação', cell: ({ getValue }) => supportValue(getValue()) },
		{ accessorKey: 'amount', header: 'Valor', cell: ({ getValue }) => money(getValue()) },
		{ accessorKey: 'platform_fee', header: 'Taxa da plataforma', cell: ({ getValue }) => money(getValue()) },
		{ accessorKey: 'provider_fee', header: 'Taxa do provedor', cell: ({ getValue }) => money(getValue()) },
		{ accessorKey: 'organizer_net', header: 'Líquido', cell: ({ getValue }) => money(getValue()) },
		{ accessorKey: 'date_created', header: 'Data', cell: ({ getValue }) => supportDate(getValue()) },
	],
	payouts: [
		{
			accessorKey: 'id',
			header: 'Repasse',
			cell: ({ row }) => (
				<div className="min-w-52">
					<p className="break-all text-xs">{String(row.original.id)}</p>
					<p className="mt-1">
						{String(row.original.pix_key_type)} · {String(row.original.pix_key)}
					</p>
					<p className="text-xs text-muted-foreground">
						{String(row.original.provider_payout_id ?? 'Sem referência externa')}
					</p>
					{Boolean(row.original.failure_reason) && (
						<p className="mt-1 text-destructive">{String(row.original.failure_reason)}</p>
					)}
				</div>
			),
		},
		{ accessorKey: 'status', header: 'Situação', cell: ({ getValue }) => supportValue(getValue()) },
		{ accessorKey: 'amount', header: 'Valor bruto', cell: ({ getValue }) => money(getValue()) },
		{ accessorKey: 'net_amount', header: 'Valor líquido', cell: ({ getValue }) => money(getValue()) },
		{ accessorKey: 'requested_at', header: 'Solicitado em', cell: ({ getValue }) => supportDate(getValue()) },
		{ accessorKey: 'processed_at', header: 'Processado em', cell: ({ getValue }) => supportDate(getValue()) },
		{
			id: 'receipt',
			header: 'Comprovante',
			cell: ({ row }) => {
				const url = safeUrl(row.original.receipt_url);

				return url ? (
					<a href={url} target="_blank" rel="noopener noreferrer" className="text-primary underline">
						Abrir comprovante
					</a>
				) : (
					'—'
				);
			},
		},
	],
	activity: [
		{ accessorKey: 'date_created', header: 'Data', cell: ({ getValue }) => supportDate(getValue()) },
		{
			id: 'actor',
			header: 'Responsável',
			cell: ({ row }) => {
				const actor = record(row.original.actor);

				return (
					<div>
						<p>{String(actor.name || actor.email || 'Sistema')}</p>
						<p className="text-xs text-muted-foreground">{String(actor.email ?? '')}</p>
					</div>
				);
			},
		},
		{
			accessorKey: 'action',
			header: 'Ação',
			cell: ({ getValue }) =>
				(
					({
						'organizer.updated': 'Dados atualizados',
						'organizer.status_updated': 'Status atualizado',
						'organizer.support_note_added': 'Atendimento registrado',
						'payout.created': 'Repasse criado',
					}) as Record<string, string>
				)[String(getValue())] ?? String(getValue()),
		},
		{ id: 'changes', header: 'Detalhes', cell: ({ row }) => <Changes row={row.original} /> },
	],
};
export function OrganizerSupportRecords({ id, kind }: { id: string; kind: OrganizerRecordQuery['kind'] }) {
	const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 10 });
	const query = useQuery({
		queryKey: ['super-admin', 'organizer', id, 'records', kind, pagination],
		queryFn: () =>
			organizerRequest<Records>(
				`/api/super-admin/organizers/${id}/records?kind=${kind}&page=${pagination.pageIndex + 1}&limit=${pagination.pageSize}`,
			),
	});
	if (query.isError)
		return (
			<div role="alert" className="space-y-3">
				<p>{query.error.message}</p>
				<Button variant="outline" onClick={() => query.refetch()}>
					Tentar novamente
				</Button>
			</div>
		);

	return (
		<div aria-busy={query.isFetching}>
			<DataTable
				columns={columnsByKind[kind].map((column) => ({ ...column, enableSorting: false }))}
				data={query.data?.data ?? []}
				getRowId={(row) => String(row.id)}
				emptyMessage={query.isPending ? 'Carregando registros…' : 'Nenhum registro encontrado.'}
				serverPagination={{ state: pagination, rowCount: query.data?.pagination.total ?? 0, onChange: setPagination }}
			/>
		</div>
	);
}
