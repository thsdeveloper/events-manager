'use client';
import { FilterSheet } from '@/components/shared/FilterSheet';
import { FilterCheckboxGroup, FilterInput, FilterSelect } from '@/components/shared/FilterFields';
import type { ParticipantFilters as Filters } from '../_lib/types';
import { statusLabels, paymentStatusLabels } from '../_lib/utils';
const defaults: Filters = {
	search: '',
	eventIds: [],
	ticketTypeIds: [],
	registrationStatus: [],
	paymentStatus: [],
	hasCheckedIn: null,
	checkInDateRange: { start: null, end: null },
};
const statuses = (['pending', 'confirmed', 'checked_in', 'cancelled'] as const).map((value) => ({
	value,
	label: statusLabels[value],
}));
const paymentStatuses = (['pending', 'paid', 'refunded', 'free'] as const).map((value) => ({
	value,
	label: paymentStatusLabels[value],
}));
interface ParticipantFiltersProps {
	filters: Filters;
	onChange: (filters: Filters) => void;
	eventOptions: Array<{ id: string; title: string }>;
	ticketTypeOptions: Array<{ id: string; title: string }>;
}
export function ParticipantFilters({ filters, onChange, eventOptions, ticketTypeOptions }: ParticipantFiltersProps) {
	return (
		<FilterSheet
			title="Filtros de participantes"
			values={filters}
			defaultValues={defaults}
			onApply={onChange}
			activeCount={
				Number(Boolean(filters.search)) +
				filters.eventIds.length +
				filters.ticketTypeIds.length +
				filters.registrationStatus.length +
				filters.paymentStatus.length +
				Number(filters.hasCheckedIn !== null)
			}
		>
			{(draft, setDraft) => (
				<>
					<FilterInput
						label="Buscar participantes"
						placeholder="Nome, e-mail, telefone, documento ou código"
						value={draft.search}
						onChange={(event) => setDraft({ ...draft, search: event.target.value })}
					/>
					{eventOptions.length > 0 && (
						<FilterCheckboxGroup
							label="Eventos"
							values={draft.eventIds}
							onChange={(eventIds) => setDraft({ ...draft, eventIds })}
							options={eventOptions.map((event) => ({ value: event.id, label: event.title }))}
						/>
					)}
					{ticketTypeOptions.length > 0 && (
						<FilterCheckboxGroup
							label="Tipos de ingresso"
							values={draft.ticketTypeIds}
							onChange={(ticketTypeIds) => setDraft({ ...draft, ticketTypeIds })}
							options={ticketTypeOptions.map((ticket) => ({ value: ticket.id, label: ticket.title }))}
						/>
					)}
					<FilterCheckboxGroup
						label="Status de inscrição"
						values={draft.registrationStatus}
						onChange={(registrationStatus) => setDraft({ ...draft, registrationStatus })}
						options={statuses}
					/>
					<FilterCheckboxGroup
						label="Status de pagamento"
						values={draft.paymentStatus}
						onChange={(paymentStatus) => setDraft({ ...draft, paymentStatus })}
						options={paymentStatuses}
					/>
					<FilterSelect
						label="Check-in"
						value={draft.hasCheckedIn === null ? 'all' : String(draft.hasCheckedIn)}
						onChange={(value) => setDraft({ ...draft, hasCheckedIn: value === 'all' ? null : value === 'true' })}
						options={[
							{ value: 'all', label: 'Todos' },
							{ value: 'true', label: 'Realizou check-in' },
							{ value: 'false', label: 'Não realizou check-in' },
						]}
					/>
				</>
			)}
		</FilterSheet>
	);
}
