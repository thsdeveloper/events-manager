/**
 * "Meus ingressos" por unidade nominal: um cartão por ingresso, com quem vai
 * nele. Quem comprou nomeia os que ficaram pendentes sem sair da página; quem
 * recebeu um ingresso comprado por outra pessoa vê de quem veio.
 */
import { screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
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
	it('opens the ticket search and period together and filters only after applying', async () => {
		const { user } = renderWithProviders(<MyTicketsContent tickets={[mine, pending, gift]} />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.type(screen.getByLabelText('Buscar ingressos'), 'GIFT');
		await user.click(screen.getByRole('combobox', { name: 'Período dos ingressos' }));
		await user.click(screen.getByRole('option', { name: /Todos/ }));
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(screen.getByText('EVT-GIFT00000003')).toBeInTheDocument();
		expect(screen.queryByText('EVT-PENDING00002')).not.toBeInTheDocument();
	});
	it('keeps the applied filters when switching between list and grid views', async () => {
		const { user } = renderWithProviders(<MyTicketsContent tickets={[mine, pending, gift]} />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.type(screen.getByLabelText('Buscar ingressos'), 'GIFT');
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		for (const name of ['Visualização em lista', 'Visualização em grade']) {
			await user.click(screen.getByRole('button', { name }));
			expect(screen.getByText('EVT-GIFT00000003')).toBeInTheDocument();
			expect(screen.queryByText('EVT-PENDING00002')).not.toBeInTheDocument();
		}
	});
	it('invites the person to explore events when there are no tickets yet', () => {
		const { container } = renderWithProviders(<MyTicketsContent tickets={[]} />);

		expect(screen.getByRole('heading', { name: 'Nenhum ingresso por aqui' })).toBeInTheDocument();
		expect(container.querySelector('img[aria-hidden="true"]')).toHaveAttribute('src', '/images/empty/tickets.svg');
		expect(screen.getByText(/quando você comprar um ingresso/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: /explorar eventos/i })).toHaveAttribute('href', '/eventos');
	});

	it('shows one card per purchase with the total tickets and links to its details page', () => {
		renderWithProviders(<MyTicketsContent tickets={[mine, pending, gift]} />);
		expect(screen.getAllByRole('article')).toHaveLength(2);
		expect(screen.getByText('2 ingressos')).toBeInTheDocument();
		expect(screen.getByText('1 participante a informar')).toBeInTheDocument();
		expect(screen.getAllByRole('link', { name: /Ver detalhes/i }).map((link) => link.getAttribute('href'))).toEqual([
			'/perfil/ingressos/reg-1',
			'/perfil/ingressos/reg-2',
		]);
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

	it('keeps all units in a purchase when searching for a particular participant or ticket', async () => {
		const { user } = renderWithProviders(<MyTicketsContent tickets={[mine, pending]} />);
		await user.click(screen.getByRole('button', { name: /Filtros/ }));
		await user.type(screen.getByLabelText('Buscar ingressos'), 'PENDING');
		await user.click(screen.getByRole('button', { name: 'Aplicar filtros' }));
		expect(screen.getByText('2 ingressos')).toBeInTheDocument();
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});

	it('offers no attendee change on a ticket someone else bought', () => {
		renderWithProviders(<MyTicketsContent tickets={[gift]} />);

		expect(screen.queryByRole('button', { name: /participante/i })).not.toBeInTheDocument();
	});
});

it('does not count pending or refunded orders as money already spent', () => {
	const unpaid = buildNominalTicket({
		id: 'unpaid',
		registration: { ...mine.registration, status: 'pending', payment_status: 'pending' },
	});
	const refunded = buildNominalTicket({
		id: 'refunded',
		registration: { ...mine.registration, status: 'cancelled', payment_status: 'refunded' },
	});
	renderWithProviders(<MyTicketsContent tickets={[mine, unpaid, refunded]} />);
	const stats = screen.getByRole('list', { name: 'Resumo dos ingressos' });
	expect(within(stats).getByText('Investido').nextSibling).toHaveTextContent('R$ 362,25');
});
