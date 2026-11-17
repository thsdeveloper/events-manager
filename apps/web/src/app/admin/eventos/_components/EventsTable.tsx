'use client';
import { useMemo } from 'react';
import type { Table } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { FilterSheet } from '@/components/shared/FilterSheet';
import { FilterCheckboxGroup, FilterInput, FilterSelect } from '@/components/shared/FilterFields';
import { type EventWithStats, getEventsColumns } from './EventsColumns';
const defaults = { title: '', status: [] as string[], event_type: [] as string[], is_free: 'all', featured: 'all' };
function EventFilters({ table }: { table: Table<EventWithStats> }) {
	const values = {
		title: (table.getColumn('title')?.getFilterValue() as string) ?? '',
		status: (table.getColumn('status')?.getFilterValue() as string[]) ?? [],
		event_type: (table.getColumn('event_type')?.getFilterValue() as string[]) ?? [],
		is_free: table.getColumn('is_free')?.getFilterValue() === true ? 'true' : 'all',
		featured: table.getColumn('featured')?.getFilterValue() === true ? 'true' : 'all',
	};

	return (
		<FilterSheet
			title="Filtros de eventos"
			values={values}
			defaultValues={defaults}
			activeCount={table.getState().columnFilters.length}
			onApply={(draft) => {
				const next = [
					{ id: 'title', value: draft.title },
					{ id: 'status', value: draft.status },
					{ id: 'event_type', value: draft.event_type },
					{ id: 'is_free', value: draft.is_free === 'true' ? true : undefined },
					{ id: 'featured', value: draft.featured === 'true' ? true : undefined },
				].filter(({ value }) => (Array.isArray(value) ? value.length > 0 : value !== '' && value !== undefined));
				table.setColumnFilters(next);
				table.setPageIndex(0);
			}}
		>
			{(draft, setDraft) => (
				<>
					<FilterInput
						label="Buscar eventos"
						placeholder="Buscar eventos..."
						value={draft.title}
						onChange={(event) => setDraft({ ...draft, title: event.target.value })}
					/>
					<FilterCheckboxGroup
						label="Status"
						values={draft.status}
						onChange={(status) => setDraft({ ...draft, status })}
						options={[
							{ value: 'published', label: 'Publicado' },
							{ value: 'draft', label: 'Rascunho' },
							{ value: 'cancelled', label: 'Cancelado' },
							{ value: 'archived', label: 'Arquivado' },
						]}
					/>
					<FilterCheckboxGroup
						label="Tipo"
						values={draft.event_type}
						onChange={(event_type) => setDraft({ ...draft, event_type })}
						options={[
							{ value: 'online', label: 'Online' },
							{ value: 'hybrid', label: 'Híbrido' },
							{ value: 'in_person', label: 'Presencial' },
						]}
					/>
					<FilterSelect
						label="Gratuidade"
						value={draft.is_free}
						onChange={(is_free) => setDraft({ ...draft, is_free })}
						options={[
							{ value: 'all', label: 'Todos' },
							{ value: 'true', label: 'Apenas gratuitos' },
						]}
					/>
					<FilterSelect
						label="Destaque"
						value={draft.featured}
						onChange={(featured) => setDraft({ ...draft, featured })}
						options={[
							{ value: 'all', label: 'Todos' },
							{ value: 'true', label: 'Apenas em destaque' },
						]}
					/>
				</>
			)}
		</FilterSheet>
	);
}
export function EventsTable({ data, onEventDeleted }: { data: EventWithStats[]; onEventDeleted?: () => void }) {
	const columns = useMemo(() => getEventsColumns(onEventDeleted), [onEventDeleted]);

	return <DataTable columns={columns} data={data} toolbar={(table) => <EventFilters table={table} />} />;
}
