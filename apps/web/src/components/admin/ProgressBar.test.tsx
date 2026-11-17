import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { ProgressBar } from './ProgressBar';

describe('form progress', () => {
	it('exposes the completion percentage and the section checklist accessibly', () => {
		renderWithProviders(
			<ProgressBar
				progress={50}
				sections={[
					{ label: 'Dados', completed: true },
					{ label: 'Ingressos', completed: false },
				]}
			/>,
		);
		expect(screen.getByRole('progressbar', { name: 'Progresso do formulário' })).toHaveAttribute('aria-valuenow', '50');
		expect(screen.getByText('1 de 2 seções completas')).toBeInTheDocument();
		expect(screen.getByText('Dados')).toBeInTheDocument();
		expect(screen.getByText('Ingressos')).toBeInTheDocument();
	});
});
