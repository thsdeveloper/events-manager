import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { PaginationLinks } from './PaginationLinks';

describe('CMS pagination', () => {
	it('preserves search and status while navigating between pages', () => {
		renderWithProviders(
			<PaginationLinks
				pathname="/super-admin/conteudo/paginas"
				pagination={{ page: 2, limit: 10, pageCount: 3, total: 25 }}
				query={{ search: 'eventos', status: 'draft', empty: undefined }}
			/>,
		);
		expect(screen.getByRole('link', { name: 'Próxima' })).toHaveAttribute(
			'href',
			'/super-admin/conteudo/paginas?search=eventos&status=draft&page=3',
		);
		expect(screen.getByRole('link', { name: 'Anterior' })).toHaveAttribute(
			'href',
			'/super-admin/conteudo/paginas?search=eventos&status=draft&page=1',
		);
	});
	it('disables the unavailable direction at either boundary', () => {
		const { rerender } = renderWithProviders(
			<PaginationLinks pathname="/paginas" pagination={{ page: 1, limit: 10, pageCount: 3, total: 25 }} />,
		);
		expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled();
		rerender(<PaginationLinks pathname="/paginas" pagination={{ page: 3, limit: 10, pageCount: 3, total: 25 }} />);
		expect(screen.getByRole('button', { name: 'Próxima' })).toBeDisabled();
	});
	it('hides pagination when all items fit on one page', () => {
		renderWithProviders(
			<PaginationLinks pathname="/paginas" pagination={{ page: 1, limit: 10, pageCount: 1, total: 1 }} />,
		);
		expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
	});
});
