import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { Ticket } from '@/components/animate-ui/icons/ticket';
import { AccountEmptyState } from './AccountEmptyState';

describe('AccountEmptyState', () => {
	it('presents the title, the explanation and an optional action', () => {
		renderWithProviders(
			<AccountEmptyState
				icon={<Ticket />}
				title="Nenhum ingresso por aqui"
				description="Quando você comprar um ingresso, ele aparecerá nesta área."
				action={<a href="/eventos">Explorar eventos</a>}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'Nenhum ingresso por aqui' })).toBeInTheDocument();
		expect(screen.getByText(/quando você comprar um ingresso/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Explorar eventos' })).toHaveAttribute('href', '/eventos');
	});

	it('keeps the animated icon decorative for assistive technology', () => {
		const { container } = renderWithProviders(
			<AccountEmptyState icon={<Ticket />} title="Nenhum ingresso por aqui" description="Nada por enquanto." />,
		);

		const icon = container.querySelector('svg');
		expect(icon?.closest('[aria-hidden="true"]')).not.toBeNull();
	});
});
