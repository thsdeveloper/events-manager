/**
 * Um cartão por unidade de ingresso. Ingressos são nominais: quem compra diz
 * quem vai usar cada um. A primeira unidade pode ser da própria pessoa, e
 * qualquer unidade pode ficar para nomear depois, para não travar a compra.
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@/test';
import { AttendeeCards, type AttendeeDraft, type AttendeeUnit } from './AttendeeCards';

const units: AttendeeUnit[] = [
	{ key: 'ticket-a:0', ticketId: 'ticket-a', ticketTitle: 'Inteira', index: 1, total: 2 },
	{ key: 'ticket-a:1', ticketId: 'ticket-a', ticketTitle: 'Inteira', index: 2, total: 2 },
];
const buyer = { name: 'Ana Souza', email: 'ana@events.local' };
const named = (name = '', email = ''): AttendeeDraft => ({ mode: 'named', name, email });

function renderCards(drafts: Record<string, AttendeeDraft>, onChange = vi.fn()) {
	render(<AttendeeCards buyer={buyer} drafts={drafts} onChange={onChange} units={units} />);

	return onChange;
}

describe('AttendeeCards', () => {
	it('shows one card per unit, naming the ticket and its position', () => {
		renderCards({ 'ticket-a:0': { mode: 'me', name: '', email: '' }, 'ticket-a:1': named() });

		expect(screen.getByRole('group', { name: 'Inteira · ingresso 1 de 2' })).toBeInTheDocument();
		expect(screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' })).toBeInTheDocument();
	});

	it('uses the buyer for the unit marked as hers and hides the fields', () => {
		renderCards({ 'ticket-a:0': { mode: 'me', name: '', email: '' }, 'ticket-a:1': named() });

		const first = screen.getByRole('group', { name: 'Inteira · ingresso 1 de 2' });
		expect(within(first).getByRole('checkbox', { name: 'Este ingresso é para mim' })).toBeChecked();
		expect(within(first).getByText('Ana Souza')).toBeInTheDocument();
		expect(within(first).queryByLabelText('Nome completo')).not.toBeInTheDocument();
	});

	it('collects name and e-mail for another person', async () => {
		const onChange = renderCards({ 'ticket-a:0': { mode: 'me', name: '', email: '' }, 'ticket-a:1': named() });

		const second = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		await userEvent.type(within(second).getByLabelText('Nome completo'), 'B');

		expect(onChange).toHaveBeenLastCalledWith('ticket-a:1', expect.objectContaining({ mode: 'named', name: 'B' }));
	});

	it('lets a unit wait to be named later, explaining what happens', async () => {
		const onChange = renderCards({ 'ticket-a:0': { mode: 'me', name: '', email: '' }, 'ticket-a:1': named() });

		const second = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		await userEvent.click(within(second).getByRole('checkbox', { name: 'Preencher depois' }));

		expect(onChange).toHaveBeenLastCalledWith('ticket-a:1', expect.objectContaining({ mode: 'later' }));
	});

	it('explains the pending state and hides the fields once a unit is left for later', () => {
		renderCards({
			'ticket-a:0': { mode: 'me', name: '', email: '' },
			'ticket-a:1': { mode: 'later', name: '', email: '' },
		});

		const second = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		expect(within(second).getByText(/área de ingressos/i)).toBeInTheDocument();
		expect(within(second).queryByLabelText('Nome completo')).not.toBeInTheDocument();
	});

	it('shows the problem next to the unit that has one', () => {
		render(
			<AttendeeCards
				buyer={buyer}
				drafts={{ 'ticket-a:0': { mode: 'me', name: '', email: '' }, 'ticket-a:1': named() }}
				errors={{ 'ticket-a:1': 'Informe nome e e-mail, ou marque para preencher depois.' }}
				onChange={vi.fn()}
				units={units}
			/>,
		);

		const second = screen.getByRole('group', { name: 'Inteira · ingresso 2 de 2' });
		expect(within(second).getByRole('alert')).toHaveTextContent('Informe nome e e-mail');
	});
});
