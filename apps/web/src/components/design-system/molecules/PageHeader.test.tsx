import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageHeader } from './PageHeader';

describe('PageHeader', () => {
	it('presents one page heading, description, context, actions without back navigation', () => {
		render(
			<PageHeader
				title="Editar evento"
				description="Atualize os dados"
				eyebrow="Eventos"
				actions={<button>Salvar</button>}
			/>,
		);
		expect(screen.getByRole('heading', { level: 1, name: 'Editar evento' })).toBeInTheDocument();
		expect(screen.getByText('Atualize os dados')).toBeInTheDocument();
		expect(screen.getByText('Eventos')).toBeInTheDocument();
		expect(screen.queryByRole('link', { name: 'Voltar aos eventos' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument();
	});
});
