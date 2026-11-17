import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test';
import { AIImageGenerationModal } from './AIImageGenerationModal';

describe('cover generation feedback', () => {
	it('announces the pending request and keeps the form protected until generation finishes', async () => {
		const { user, rerender } = renderWithProviders(
			<AIImageGenerationModal isOpen eventTitle="Festival de música" categoryName="Música" />,
		);
		expect(screen.getByRole('dialog', { name: 'Criando sua capa' })).toBeInTheDocument();
		expect(screen.getByText('Festival de música · Música')).toBeInTheDocument();
		expect(screen.getByRole('status')).toHaveTextContent('Gerando uma imagem');
		expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
		await user.keyboard('{Escape}');
		expect(screen.getByRole('dialog')).toBeInTheDocument();
		rerender(<AIImageGenerationModal isOpen={false} eventTitle="Festival de música" />);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
	});
	it('does not display missing category information', () => {
		renderWithProviders(<AIImageGenerationModal isOpen eventTitle="Meu evento" />);
		expect(screen.getByText('Meu evento')).toBeInTheDocument();
	});
});
