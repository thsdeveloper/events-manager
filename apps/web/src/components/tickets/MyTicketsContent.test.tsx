/**
 * "Meus ingressos" por unidade nominal: um cartão por ingresso, com quem vai
 * nele. Quem comprou nomeia os que ficaram pendentes sem sair da página; quem
 * recebeu um ingresso comprado por outra pessoa vê de quem veio.
 */
import { screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { buildNominalTicket } from '@/test/nominal-ticket';
import { MyTicketsContent } from './MyTicketsContent';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const mine = buildNominalTicket();
const pending = buildNominalTicket({
	id: 't-2',
	sequence: 2,
	ticket_code: 'EVT-PENDING00002',
	attendee_name: null,
	attendee_email: null,
	is_buyer: false,
});
const gift = buildNominalTicket({
	id: 't-3',
	ticket_code: 'EVT-GIFT00000003',
	attendee_name: 'Ana Souza',
	attendee_email: 'ana@events.local',
	is_buyer: false,
	can_edit_attendee: false,
	total_amount: 100,
	registration: {
		...mine.registration,
		id: 'reg-2',
		user_id: 'u-9',
		participant_name: 'Carlos Dias',
		participant_email: 'carlos@events.local',
	},
});

describe('MyTicketsContent', () => {
	it('invites the person to explore events when there are no tickets yet', () => {
		const { container } = renderWithProviders(<MyTicketsContent tickets={[]} />);

		expect(screen.getByRole('heading', { name: 'Nenhum ingresso por aqui' })).toBeInTheDocument();
		expect(container.querySelector('img[aria-hidden="true"]')).toHaveAttribute('src', '/images/empty/tickets.svg');
		expect(screen.getByText(/quando você comprar um ingresso/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /explorar eventos/i })).toHaveAttribute('href', '/eventos');
	});

	it('shows one card per ticket, naming who goes on each and who bought a gift', () => {
		renderWithProviders(<MyTicketsContent tickets={[mine, pending, gift]} />);

		expect(screen.getAllByText('EVT-7D5F942FFF94')).not.toHaveLength(0);
		expect(screen.getByText('Participante a informar')).toBeInTheDocument();
		expect(screen.getByText('Comprado por Carlos Dias')).toBeInTheDocument();
	});

	it('counts every ticket, but only sums what the person paid for herself', () => {
		// Investido: soma dos ingressos comprados pela pessoa (quem pode editar o
		// participante ou é dona do ingresso). O presente do Carlos não entra.
		renderWithProviders(<MyTicketsContent tickets={[mine, pending, gift]} />);

		const stats = screen.getByRole('list', { name: 'Resumo dos ingressos' });
		expect(within(stats).getByText('Ingressos').nextSibling).toHaveTextContent('3');
		expect(within(stats).getByText('Investido').nextSibling).toHaveTextContent('R$ 724,50');
	});

	it('lets the buyer name a pending ticket and shows the name without reloading', async () => {
		mockFetch([
			[
				'/api/user/tickets/t-2/attendee',
				() => jsonResponse({ ...pending, attendee_name: 'Bia Lima', attendee_email: 'bia@events.local' }),
			],
		]);
		const { user } = renderWithProviders(<MyTicketsContent tickets={[mine, pending]} />);

		await user.click(screen.getByRole('button', { name: 'Informar participante' }));
		await user.type(screen.getByLabelText('Nome completo'), 'Bia Lima');
		await user.type(screen.getByLabelText('E-mail'), 'bia@events.local');
		await user.click(screen.getByRole('button', { name: 'Salvar participante' }));

		expect(await screen.findByText('Bia Lima')).toBeInTheDocument();
		expect(screen.queryByText('Participante a informar')).not.toBeInTheDocument();
	});

	it('offers no attendee change on a ticket someone else bought', () => {
		renderWithProviders(<MyTicketsContent tickets={[gift]} />);

		expect(screen.queryByRole('button', { name: /participante/i })).not.toBeInTheDocument();
	});
});
