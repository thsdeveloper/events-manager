import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { emptyIllustrations } from '@/lib/illustrations';
import { EmptyState } from './EmptyState';

describe('EmptyState', () => {
	it('presents the title, the explanation and an optional action', () => {
		renderWithProviders(
			<EmptyState
				icon={<span data-testid="icon" />}
				title="Sua agenda começa aqui"
				description="Quando você publicar eventos, os números aparecerão aqui."
				action={<a href="/admin/eventos/novo">Criar primeiro evento</a>}
			/>,
		);

		expect(screen.getByRole('heading', { name: 'Sua agenda começa aqui' })).toBeInTheDocument();
		expect(screen.getByText(/quando você publicar eventos/i)).toBeInTheDocument();
		expect(screen.getByRole('link', { name: 'Criar primeiro evento' })).toHaveAttribute('href', '/admin/eventos/novo');
		expect(screen.getByTestId('icon')).toBeInTheDocument();
	});

	it('shows the illustration instead of the icon chip when one is given', () => {
		const { container } = renderWithProviders(
			<EmptyState
				icon={<span data-testid="icon" />}
				illustration={emptyIllustrations.overview}
				title="Sua agenda começa aqui"
				description="Nada por enquanto."
			/>,
		);

		const img = container.querySelector('img');
		expect(img).toHaveAttribute('src', '/images/empty/overview.svg');
		expect(img).toHaveAttribute('aria-hidden', 'true');
		expect(screen.queryByTestId('icon')).not.toBeInTheDocument();
	});
});
