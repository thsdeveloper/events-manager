import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { RichTextEditor } from './RichTextEditor';

describe('RichTextEditor', () => {
	it('shows the current HTML and reports every edit back as HTML', { timeout: 20_000 }, async () => {
		const onChange = vi.fn();
		const { user } = renderWithProviders(<RichTextEditor value="<p>Olá</p>" onChange={onChange} />);

		const editor = await screen.findByRole('textbox', { name: /conteúdo/i });
		expect(editor).toHaveTextContent('Olá');

		// O jsdom não digita em contenteditable; a lista é uma edição equivalente.
		await user.click(editor);
		await user.keyboard('{Control>}a{/Control}');
		await user.click(screen.getByRole('button', { name: /^lista$/i }));

		await waitFor(() =>
			expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('<ul><li><p>Olá</p></li></ul>')),
		);
	});

	it('wraps the selection with the toolbar formatting', async () => {
		const onChange = vi.fn();
		const { user } = renderWithProviders(<RichTextEditor value="<p>Olá</p>" onChange={onChange} />);

		const editor = await screen.findByRole('textbox', { name: /conteúdo/i });
		await user.click(editor);
		await user.keyboard('{Control>}a{/Control}');
		await user.click(screen.getByRole('button', { name: /negrito/i }));

		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p><strong>Olá</strong></p>'));
		expect(screen.getByRole('button', { name: /negrito/i })).toHaveAttribute('aria-pressed', 'true');
	});
});
