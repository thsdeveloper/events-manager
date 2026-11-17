import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { nominalTicket } from '../_lib/fixtures';
import { ParticipantsTable } from './ParticipantsTable';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

function renderTable(data = [nominalTicket()]) {
	return renderWithProviders(
		<ParticipantsTable data={data} isLoading={false} pageCount={1} currentPage={1} onPageChange={vi.fn()} />,
	);
}

describe('ParticipantsTable', () => {
	it('announces partial selection and can select or clear all tickets', async () => {
		const { user } = renderTable([nominalTicket(), nominalTicket({ id: 'second', attendee_name: 'Carlos' })]);
		const all = screen.getByRole('checkbox', { name: 'Selecionar todos os ingressos' });
		await user.click(screen.getByRole('checkbox', { name: 'Selecionar Bia Lima' }));
		expect(all).toBePartiallyChecked();
		await user.click(all);
		expect(screen.getByRole('checkbox', { name: 'Selecionar Carlos' })).toBeChecked();
		await user.click(all);
		expect(screen.getByRole('checkbox', { name: 'Selecionar Bia Lima' })).not.toBeChecked();
	});

	it('shows a standard empty state when the filters match nobody', () => {
		const { container } = renderTable([]);

		expect(screen.getByRole('heading', { name: 'Nenhum participante encontrado' })).toBeInTheDocument();
		expect(screen.getByText(/ajustar os filtros/i)).toBeInTheDocument();
		expect(container.querySelector('img')).not.toBeInTheDocument();
	});

	it('lists one row per ticket, naming the attendee and who bought it for them', () => {
		renderTable();

		const row = screen.getAllByRole('row')[1];
		expect(within(row).getByText('Bia Lima')).toBeInTheDocument();
		expect(within(row).getByText('Comprado por Ana Souza')).toBeInTheDocument();
		expect(within(row).getByText('Ingresso 2 de 5')).toBeInTheDocument();
		expect(within(row).getByText('R$ 110,00')).toBeInTheDocument();
	});

	it('flags a ticket still waiting for a name and hides "bought by" on the buyer’s own ticket', () => {
		renderTable([
			nominalTicket({ id: 't-pending', attendee_name: null, attendee_email: null }),
			nominalTicket({ id: 't-buyer', is_buyer: true, attendee_name: 'Ana Souza', attendee_email: 'ana@events.local' }),
		]);

		const [, pending, own] = screen.getAllByRole('row');
		expect(within(pending).getByText('Participante a informar')).toBeInTheDocument();
		expect(within(own).queryByText(/Comprado por/)).not.toBeInTheDocument();
	});
});
