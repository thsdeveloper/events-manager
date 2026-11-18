import { renderAsOwner } from '@/test/permissions';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch } from '@/test';
import { CancelRegistrationDialog } from './CancelRegistrationDialog';
import { nominalTicket } from '../_lib/fixtures';
import type { NominalTicket } from '@events-manager/contracts';

/** O diálogo recebe um ingresso; o cancelamento é do pedido a que ele pertence. */
function participant(overrides: Partial<NominalTicket['registration']> = {}) {
	return nominalTicket({ id: 'reg-1', registration: { ...nominalTicket().registration, ...overrides } });
}

describe('CancelRegistrationDialog', () => {
	it('offers to refund a paid registration and sends the choice along with the reason', async () => {
		const fetchMock = mockFetch([['/api/admin/participantes/reg-1/cancel', () => jsonResponse({ success: true })]]);
		const { user } = renderAsOwner(
			<CancelRegistrationDialog open onOpenChange={vi.fn()} participant={participant()} />,
		);

		await user.type(screen.getByLabelText(/motivo do cancelamento/i), 'Evento cancelado pelo organizador');
		await user.click(screen.getByRole('checkbox', { name: /reembolsar/i }));
		await user.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({
			reason: 'Evento cancelado pelo organizador',
			refund: true,
		});
	});

	it('cancels without a refund unless the organizer asks for one', async () => {
		const fetchMock = mockFetch([['/api/admin/participantes/reg-1/cancel', () => jsonResponse({ success: true })]]);
		const { user } = renderAsOwner(
			<CancelRegistrationDialog open onOpenChange={vi.fn()} participant={participant()} />,
		);

		await user.type(screen.getByLabelText(/motivo do cancelamento/i), 'Pedido da própria pessoa');
		await user.click(screen.getByRole('button', { name: /confirmar cancelamento/i }));

		await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce());
		expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toMatchObject({ refund: false });
	});

	it('does not offer a refund when nothing was paid', () => {
		renderAsOwner(
			<CancelRegistrationDialog
				open
				onOpenChange={vi.fn()}
				participant={participant({ payment_status: 'free', total_amount: 0 })}
			/>,
		);

		expect(screen.queryByRole('checkbox', { name: /reembolsar/i })).not.toBeInTheDocument();
	});

	it('warns that the whole order goes, with how many tickets and who bought them', () => {
		renderAsOwner(<CancelRegistrationDialog open onOpenChange={vi.fn()} participant={participant()} />);

		expect(screen.getByText(/todos os 5 ingressos/i)).toBeInTheDocument();
		expect(screen.getByText(/Ana Souza/)).toBeInTheDocument();
	});
});
