'use client';
import { FilterSheet } from '@/components/shared/FilterSheet';
import { FilterInput, FilterDate, FilterSelect } from '@/components/shared/FilterFields';
export type RangeOption = '30d' | '90d' | 'year' | 'custom';
export type StatusOption = 'all' | 'succeeded' | 'pending' | 'failed' | 'refunded';

export type AppliedFilters = {
	range: RangeOption;
	status: StatusOption;
	eventId: string | 'all';
	search: string;
	customFrom: string | null;
	customTo: string | null;
};

export type FiltersDraft = AppliedFilters;

interface FinanceFiltersProps {
	events: Array<{ id: string; title: string }>;
	filters: AppliedFilters;
	onApply: (draft: FiltersDraft) => void;
}

const defaultDraft: FiltersDraft = {
	range: '30d',
	status: 'all',
	eventId: 'all',
	search: '',
	customFrom: null,
	customTo: null,
};

export default function FinanceFilters({ events, filters, onApply }: FinanceFiltersProps) {
	return (
		<FilterSheet
			title="Filtros financeiros"
			values={filters}
			defaultValues={defaultDraft}
			onApply={onApply}
			activeCount={
				Number(filters.range !== '30d') +
				Number(filters.status !== 'all') +
				Number(filters.eventId !== 'all') +
				Number(Boolean(filters.search))
			}
			validate={(draft) => {
				if (draft.range !== 'custom') return;
				if (!draft.customFrom || !draft.customTo) return 'Informe a data inicial e a data final.';
				if (draft.customTo < draft.customFrom) return 'A data final deve ser igual ou posterior à data inicial.';
			}}
		>
			{(draft, setDraft) => (
				<>
					<FilterSelect
						label="Período"
						value={draft.range}
						onChange={(range) => setDraft({ ...draft, range })}
						options={[
							{ value: '30d', label: 'Últimos 30 dias' },
							{ value: '90d', label: 'Últimos 90 dias' },
							{ value: 'year', label: 'Últimos 12 meses' },
							{ value: 'custom', label: 'Personalizado' },
						]}
					/>
					{draft.range === 'custom' && (
						<>
							<FilterDate
								label="Data inicial"
								value={draft.customFrom ?? ''}
								onChange={(value) => setDraft({ ...draft, customFrom: value || null })}
							/>
							<FilterDate
								label="Data final"
								value={draft.customTo ?? ''}
								onChange={(value) => setDraft({ ...draft, customTo: value || null })}
							/>
						</>
					)}
					<FilterSelect
						label="Status"
						value={draft.status}
						onChange={(status) => setDraft({ ...draft, status })}
						options={[
							{ value: 'all', label: 'Todos' },
							{ value: 'succeeded', label: 'Pago' },
							{ value: 'pending', label: 'Pendente' },
							{ value: 'failed', label: 'Falhou' },
							{ value: 'refunded', label: 'Reembolsado' },
						]}
					/>
					<FilterSelect
						label="Evento"
						value={draft.eventId}
						onChange={(eventId) => setDraft({ ...draft, eventId })}
						options={[
							{ value: 'all', label: 'Todos os eventos' },
							...events.map((event) => ({ value: event.id, label: event.title })),
						]}
					/>
					<FilterInput
						label="Busca"
						placeholder="Nome, email ou ID AbacatePay"
						value={draft.search}
						onChange={(event) => setDraft({ ...draft, search: event.target.value })}
					/>
				</>
			)}
		</FilterSheet>
	);
}
