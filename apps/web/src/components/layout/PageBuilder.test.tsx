import type { PageBlock } from '@events-manager/contracts';
import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import PageBuilder from './PageBuilder';

describe('CMS page sections', () => {
	it('exposes each editorial block as a named region with its heading and readable content', () => {
		const sections = ['light', 'dark'].map((background) => ({
			id: background,
			collection: 'block_richtext',
			background,
			item: {
				id: background,
				headline: background === 'light' ? 'Sobre a plataforma' : 'Políticas de uso',
				content: '<p>Leia as condições antes de <a href="/eventos">participar de um evento</a>.</p>',
				alignment: 'left',
			},
		})) as PageBlock[];
		renderWithProviders(<PageBuilder sections={sections} />);
		for (const title of ['Sobre a plataforma', 'Políticas de uso']) {
			const section = within(screen.getByRole('region', { name: title }));
			expect(section.getByRole('heading', { name: title })).toBeInTheDocument();
			expect(section.getByRole('link', { name: 'participar de um evento' })).toHaveAttribute('href', '/eventos');
		}
	});
});
