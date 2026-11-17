import { renderWithProviders } from '@/test';
import { screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { ProgressBar } from './ProgressBar';

it('announces form completion with a named progress indicator', () => {
	renderWithProviders(
		<ProgressBar
			progress={50}
			sections={[
				{ label: 'Nome', completed: true },
				{ label: 'Local', completed: false },
			]}
		/>,
	);
	expect(screen.getByRole('progressbar', { name: 'Progresso do formulário' })).toHaveAttribute('aria-valuenow', '50');
	expect(screen.getByText('1 de 2 seções completas')).toBeInTheDocument();
});
