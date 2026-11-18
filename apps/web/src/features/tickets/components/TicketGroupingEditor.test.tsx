import { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { screen, within } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import type { EventTicketGroupDraft } from '@events-manager/contracts';
import { TicketGroupingEditor } from './TicketGroupingEditor';
function Host() {
	const [groups, setGroups] = useState<EventTicketGroupDraft[]>([]);

	return (
		<>
			<TicketGroupingEditor groups={groups} onChange={setGroups} />
			<output aria-label="groups">{JSON.stringify(groups)}</output>
		</>
	);
}
describe('ticket grouping', () => {
	it('creates a root and a subgroup, then removes the branch together', async () => {
		const { user } = renderWithProviders(<Host />);
		await user.type(screen.getByRole('textbox', { name: 'Novo grupo' }), 'Pista');
		await user.click(screen.getByRole('button', { name: 'Adicionar grupo' }));
		const first = JSON.parse(screen.getByLabelText('groups').textContent ?? '[]')[0];
		await user.click(screen.getByRole('combobox', { name: 'Grupo pai' }));
		await user.click(screen.getByRole('option', { name: 'Pista' }));
		await user.type(screen.getByRole('textbox', { name: 'Novo grupo' }), 'VIP');
		await user.click(screen.getByRole('button', { name: 'Adicionar grupo' }));
		const groups = JSON.parse(screen.getByLabelText('groups').textContent ?? '[]');
		expect(groups[1]).toMatchObject({ title: 'VIP', parent_client_id: first.client_id });
		await user.click(screen.getByRole('button', { name: 'Remover grupo Pista' }));
		expect(screen.getByLabelText('groups')).toHaveTextContent('[]');
	});
});

it('explains groups and independent ticket prices in a help dialog', async () => {
	const { user } = renderWithProviders(<Host />);
	await user.click(screen.getByRole('button', { name: 'Como funcionam os grupos de ingressos?' }));
	const dialog = screen.getByRole('dialog');
	expect(within(dialog).getByText(/cada ingresso mantém seu próprio preço/i)).toBeInTheDocument();
	expect(within(dialog).getByText('Pista')).toBeInTheDocument();
	expect(within(dialog).getByText('Meia-entrada')).toBeInTheDocument();
});
