'use client';
import { useState } from 'react';
import { endOfDay, format, startOfDay, subDays } from 'date-fns';
import { FilterSheet } from '@/components/shared/FilterSheet';
import { FilterDate, FilterSelect } from '@/components/shared/FilterFields';
import type { AnalyticsFilters as Filters } from '../actions';
function selectedRange(filters: Filters) {
	if (!filters.startDate || !filters.endDate) return 'custom';
	const { startDate, endDate } = filters;

	return (
		[7, 30, 90, 365].find((days) => subDays(endDate, days).getTime() === startDate.getTime())?.toString() ?? 'custom'
	);
}
interface AnalyticsFiltersProps {
	onFilterChange: (filters: Filters) => void;
	filters?: Filters;
	events?: Array<{ id: string; title: string }>;
	organizers?: Array<{ id: string; name: string }>;
}
export function AnalyticsFilters({
	onFilterChange,
	filters: controlled,
	events = [],
	organizers = [],
}: AnalyticsFiltersProps) {
	const [applied, setApplied] = useState<Filters>({});
	const filters = controlled ?? applied;

	return (
		<FilterSheet
			title="Filtros de análises"
			values={filters}
			defaultValues={{}}
			activeCount={
				Number(Boolean(filters.startDate || filters.endDate)) +
				Number(Boolean(filters.eventId)) +
				Number(Boolean(filters.organizerId))
			}
			onApply={(next) => {
				setApplied(next);
				onFilterChange(next);
			}}
			validate={(draft) =>
				draft.startDate && draft.endDate && draft.endDate < draft.startDate
					? 'A data final deve ser igual ou posterior à data inicial.'
					: undefined
			}
		>
			{(draft, setDraft) => (
				<>
					<FilterSelect
						label="Período"
						value={selectedRange(draft)}
						onChange={(value) => {
							if (value === 'custom') {
								setDraft({ ...draft, startDate: undefined, endDate: undefined });

								return;
							}
							const endDate = new Date();
							setDraft({ ...draft, startDate: subDays(endDate, Number(value)), endDate });
						}}
						options={[
							{ value: 'custom', label: 'Escolher datas' },
							{ value: '7', label: 'Últimos 7 dias' },
							{ value: '30', label: 'Últimos 30 dias' },
							{ value: '90', label: 'Últimos 90 dias' },
							{ value: '365', label: 'Últimos 12 meses' },
						]}
					/>
					<FilterDate
						label="Data inicial"
						value={draft.startDate ? format(draft.startDate, 'yyyy-MM-dd') : ''}
						onChange={(value) =>
							setDraft({
								...draft,
								startDate: value ? startOfDay(new Date(value + 'T00:00:00')) : undefined,
							})
						}
					/>
					<FilterDate
						label="Data final"
						value={draft.endDate ? format(draft.endDate, 'yyyy-MM-dd') : ''}
						onChange={(value) =>
							setDraft({
								...draft,
								endDate: value ? endOfDay(new Date(value + 'T00:00:00')) : undefined,
							})
						}
					/>
					{events.length > 0 && (
						<FilterSelect
							label="Evento"
							value={draft.eventId ?? ''}
							onChange={(eventId) => setDraft({ ...draft, eventId: eventId || undefined })}
							options={[
								{ value: '', label: 'Todos os eventos' },
								...events.map((event) => ({ value: event.id, label: event.title })),
							]}
						/>
					)}
					{organizers.length > 0 && (
						<FilterSelect
							label="Organizador"
							value={draft.organizerId ?? ''}
							onChange={(organizerId) => setDraft({ ...draft, organizerId: organizerId || undefined })}
							options={[
								{ value: '', label: 'Todos os organizadores' },
								...organizers.map((organizer) => ({ value: organizer.id, label: organizer.name })),
							]}
						/>
					)}
				</>
			)}
		</FilterSheet>
	);
}
