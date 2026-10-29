/**
 * Diálogo para nomear (ou corrigir) o participante de um ingresso nominal. O
 * servidor valida e devolve o ingresso atualizado; a tela só repete o motivo
 * de uma recusa e entrega o resultado a quem abriu o diálogo.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import { buildNominalTicket } from '@/test/nominal-ticket';
import { NameAttendeeDialog } from './NameAttendeeDialog';

const pending = buildNominalTicket({ id: 't-2', attendee_name: null, attendee_email: null, is_buyer: false });

describe('NameAttendeeDialog', () => {
	it('sends the attendee to the API and hands the updated ticket back', async () => {
		const onSaved = vi.fn();
		const fetchMock = mockFetch([
			[
				'/api/user/tickets/t-2/attendee',
				() => jsonResponse({ ...pending, attendee_name: 'Bia Lima', attendee_email: 'bia@events.local' }),
			],
		]);
		const { user } = renderWithProviders(<NameAttendeeDialog ticket={pending} onClose={vi.fn()} onSaved={onSaved} />);

		await user.type(screen.getByLabelText('Nome completo'), 'Bia Lima');
		await user.type(screen.getByLabelText('E-mail'), 'bia@events.local');
		await user.type(screen.getByLabelText('Telefone'), '11912345678');
		await user.click(screen.getByRole('button', { name: 'Salvar participante' }));

		await waitFor(() => expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ attendee_name: 'Bia Lima' })));
		const [url, init] = fetchMock.mock.calls[0];
		expect(url).toBe('/api/user/tickets/t-2/attendee');
		expect(init).toMatchObject({ method: 'PATCH', credentials: 'include' });
		expect(JSON.parse(String(init?.body))).toEqual({
			name: 'Bia Lima',
			email: 'bia@events.local',
			phone: '11912345678',
		});
	});

	it('starts from the current attendee when correcting a named ticket', () => {
		renderWithProviders(<NameAttendeeDialog ticket={buildNominalTicket()} onClose={vi.fn()} onSaved={vi.fn()} />);

		expect(screen.getByLabelText('Nome completo')).toHaveValue('Ana Souza');
		expect(screen.getByLabelText('E-mail')).toHaveValue('ana@events.local');
	});

	it('shows why the server refused, naming the field', async () => {
		mockFetch([
			[
				'/api/user/tickets/t-2/attendee',
				() =>
					problemResponse(422, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', {
						errors: { fieldErrors: { email: ['Informe um e-mail válido.'] }, formErrors: [] },
					}),
			],
		]);
		const onSaved = vi.fn();
		const { user } = renderWithProviders(<NameAttendeeDialog ticket={pending} onClose={vi.fn()} onSaved={onSaved} />);

		await user.type(screen.getByLabelText('Nome completo'), 'Bia');
		await user.type(screen.getByLabelText('E-mail'), 'bia@events');
		await user.click(screen.getByRole('button', { name: 'Salvar participante' }));

		expect(await screen.findByRole('alert')).toHaveTextContent('Informe um e-mail válido.');
		expect(onSaved).not.toHaveBeenCalled();
	});

	it('does not call the server without a name and an e-mail', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<NameAttendeeDialog ticket={pending} onClose={vi.fn()} onSaved={vi.fn()} />);

		await user.click(screen.getByRole('button', { name: 'Salvar participante' }));

		expect(fetchMock).not.toHaveBeenCalled();
		expect(screen.getByRole('alert')).toHaveTextContent(/nome e o e-mail/i);
	});
});
