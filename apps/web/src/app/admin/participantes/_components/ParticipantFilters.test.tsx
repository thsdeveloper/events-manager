import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { ParticipantFilters } from './ParticipantFilters';
import type { ParticipantFilters as Filters } from '../_lib/types';
const filters: Filters = {
	search: '',
	eventIds: [],
	ticketTypeIds: [],
	registrationStatus: [],
	paymentStatus: [],
	hasCheckedIn: null,
	checkInDateRange: { start: null, end: null },
};
it('groups participant criteria in one sheet and applies the whole selection at once', async () => {
	const change = vi.fn();
	const { user } = renderWithProviders(
		<ParticipantFilters
			filters={filters}
			onChange={change}
			eventOptions={[{ id: 'e1', title: 'Congresso' }]}
			ticketTypeOptions={[{ id: 't1', title: 'Inteira' }]}
		/>,
	);
	await user.click(screen.getByRole('button', { name: /Filtros/ }));
	for (const checkbox of screen.getAllByRole('checkbox')) expect(checkbox).toHaveAccessibleName();
	await user.type(screen.getByLabelText('Buscar participantes'), 'Ana');
	await user.click(screen.getByRole('checkbox', { name: 'Congresso' }));
	await user.click(screen.getByRole('checkbox', { name: 'Inteira' }));
	await user.click(
		within(screen.getByRole('group', { name: 'Status de inscrição' })).getByRole('checkbox', { name: 'Confirmado' }),
	);
	await user.click(screen.getByRole('combobox', { name: 'Check-in' }));
	await user.click(screen.getByRole('option', { name: 'Não realizou check-in' }));
	expect(change).not.toHaveBeenCalled();
	await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
	expect(change).toHaveBeenCalledExactlyOnceWith({
		...filters,
		search: 'Ana',
		eventIds: ['e1'],
		ticketTypeIds: ['t1'],
		registrationStatus: ['confirmed'],
		hasCheckedIn: false,
	});
});
