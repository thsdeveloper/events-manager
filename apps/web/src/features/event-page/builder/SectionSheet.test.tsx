/**
 * Painel lateral de edição de uma seção. A âncora vira `#link` na página,
 * então precisa ser válida e única; o rascunho só muda ao aplicar.
 */
import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { buildEventPageSection } from '@events-manager/contracts';
import { renderWithProviders } from '@/test';
import { SectionSheet } from './SectionSheet';

vi.mock('@/components/admin/ImageUpload', () => ({ default: () => null }));
vi.mock('@/features/cms/components/RichTextEditor', () => ({
	RichTextEditor: ({ label }: { label: string }) => <textarea aria-label={label} />,
}));

function renderSheet() {
	const onApply = vi.fn();
	const onClose = vi.fn();
	const view = renderWithProviders(
		<SectionSheet
			section={buildEventPageSection('about')}
			takenAnchors={['ingressos']}
			onApply={onApply}
			onClose={onClose}
		/>,
	);

	return { ...view, onApply, onClose };
}

describe('SectionSheet', () => {
	it('refuses an anchor that would not work as a #link, and one another section already uses', async () => {
		const { onApply, user } = renderSheet();
		const anchor = screen.getByLabelText('Âncora');

		await user.clear(anchor);
		await user.type(anchor, 'Sobre Nós');
		await user.click(screen.getByRole('button', { name: 'Aplicar' }));
		expect(screen.getByText(/letras minúsculas/i)).toBeInTheDocument();

		await user.clear(anchor);
		await user.type(anchor, 'ingressos');
		await user.click(screen.getByRole('button', { name: 'Aplicar' }));
		expect(screen.getByText(/já usa esta âncora/i)).toBeInTheDocument();
		expect(onApply).not.toHaveBeenCalled();
	});

	it('applies the title and a valid anchor only when asked, and closes on cancel', async () => {
		const { onApply, onClose, user } = renderSheet();

		await user.clear(screen.getByLabelText('Título da seção'));
		await user.type(screen.getByLabelText('Título da seção'), 'Nossa história');
		await user.clear(screen.getByLabelText('Âncora'));
		await user.type(screen.getByLabelText('Âncora'), 'historia');
		expect(onApply).not.toHaveBeenCalled();

		await user.click(screen.getByRole('button', { name: 'Aplicar' }));
		expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ title: 'Nossa história', anchor: 'historia' }));

		await user.click(screen.getByRole('button', { name: 'Cancelar' }));
		expect(onClose).toHaveBeenCalled();
	});
});
