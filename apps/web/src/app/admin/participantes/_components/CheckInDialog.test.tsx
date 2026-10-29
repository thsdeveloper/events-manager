/**
 * Check-in é por ingresso nominal. Sem participante informado não há quem
 * confirmar na porta: o botão fica bloqueado e o painel diz o porquê.
 */
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { nominalTicket } from '../_lib/fixtures';
import { CheckInDialog } from './CheckInDialog';

describe('CheckInDialog', () => {
	it('checks in the chosen ticket by its own id', async () => {
		const fetchMock = mockFetch([['/api/admin/participantes/t-1/checkin', () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(<CheckInDialog open onOpenChange={vi.fn()} participant={nominalTicket()} />);

		expect(screen.getByText('Bia Lima')).toBeInTheDocument();
		expect(screen.getByText('EVT-2')).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /confirmar check-in/i }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
		expect(fetchMock.mock.calls[0][1]).toMatchObject({ method: 'POST' });
	});

	it('blocks check-in until someone is named on the ticket', () => {
		renderWithProviders(
			<CheckInDialog
				open
				onOpenChange={vi.fn()}
				participant={nominalTicket({ attendee_name: null, attendee_email: null })}
			/>,
		);

		expect(screen.getByRole('button', { name: /confirmar check-in/i })).toBeDisabled();
		expect(screen.getByText(/informe o participante antes do check-in/i)).toBeInTheDocument();
	});
});
