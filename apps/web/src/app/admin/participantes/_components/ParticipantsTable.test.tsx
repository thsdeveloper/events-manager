import { renderWithProviders } from '@/test';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ParticipantRow } from '../_lib/types';
import { ParticipantsTable } from './ParticipantsTable';

const data = ['Ana', 'Bruno'].map((name, index) => ({
	id: `registration-${index}`,
	participant_name: name,
	participant_email: `${name}@example.com`,
	event_id: { id: 'event-1', title: 'Conferência', start_date: '2026-12-10T12:00:00Z' },
	ticket_type_id: null,
	user_id: null,
	payment_status: 'paid',
	total_amount: 100,
})) as ParticipantRow[];

describe('ParticipantsTable', () => {
	it('communicates partial selection and lets the organizer select or clear the page', async () => {
		const { user } = renderWithProviders(
			<ParticipantsTable data={data} isLoading={false} pageCount={2} currentPage={1} onPageChange={vi.fn()} />,
		);
		const table = within(screen.getByRole('table'));
		const all = table.getByRole('checkbox', { name: 'Selecionar todos os participantes' });
		await user.click(table.getByRole('checkbox', { name: 'Selecionar Ana' }));
		expect(all).toBePartiallyChecked();
		await user.click(all);
		expect(table.getByRole('checkbox', { name: 'Selecionar Bruno' })).toBeChecked();
		await user.click(all);
		expect(table.getByRole('checkbox', { name: 'Selecionar Ana' })).not.toBeChecked();
	});

	it('keeps server pagination and participant actions available', async () => {
		const onPageChange = vi.fn();
		const { user } = renderWithProviders(
			<ParticipantsTable data={data} isLoading={false} pageCount={2} currentPage={1} onPageChange={onPageChange} />,
		);
		expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: 'Próxima' }));
		expect(onPageChange).toHaveBeenCalledWith(2);
		await user.click(within(screen.getByRole('table')).getAllByRole('button', { name: 'Abrir menu' })[0]);
		expect(await screen.findByRole('menuitem', { name: 'Ver detalhes' })).toHaveAttribute(
			'href',
			'/admin/participantes/registration-0',
		);
	});
});
