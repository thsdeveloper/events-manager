/**
 * Editar participante altera a pessoa daquele ingresso, não quem comprou. As
 * observações continuam sendo do pedido.
 */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { nominalTicket } from '../_lib/fixtures';
import { EditParticipantDialog } from './EditParticipantDialog';

describe('EditParticipantDialog', () => {
	it('starts from the attendee of the ticket and the notes of the order', () => {
		renderWithProviders(
			<EditParticipantDialog
				open
				onOpenChange={vi.fn()}
				participant={nominalTicket({ registration: { ...nominalTicket().registration, notes: 'VIP' } })}
			/>,
		);

		expect(screen.getByLabelText(/nome completo/i)).toHaveValue('Bia Lima');
		expect(screen.getByLabelText(/^email/i)).toHaveValue('bia@events.local');
		expect(screen.getByLabelText(/observações/i)).toHaveValue('VIP');
	});

	it('lets the organizer name a pending ticket and sends it to the ticket endpoint', async () => {
		const fetchMock = mockFetch([['/api/admin/participantes/t-1/edit', () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(
			<EditParticipantDialog
				open
				onOpenChange={vi.fn()}
				participant={nominalTicket({ attendee_name: null, attendee_email: null })}
			/>,
		);

		await user.type(screen.getByLabelText(/nome completo/i), 'Caio Melo');
		await user.type(screen.getByLabelText(/^email/i), 'caio@events.local');
		await user.click(screen.getByRole('button', { name: /salvar/i }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
			participant_name: 'Caio Melo',
			participant_email: 'caio@events.local',
		});
	});

	it('locks the ticket after check-in: no fields, no save, and the way out is undoing the check-in', () => {
		renderWithProviders(
			<EditParticipantDialog
				open
				onOpenChange={vi.fn()}
				participant={nominalTicket({ check_in_date: '2026-09-19T13:00:00.000Z' })}
			/>,
		);

		expect(screen.getByRole('alert')).toHaveTextContent(/check-in/i);
		expect(screen.queryByLabelText(/nome completo/i)).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: /salvar/i })).not.toBeInTheDocument();
	});
});
