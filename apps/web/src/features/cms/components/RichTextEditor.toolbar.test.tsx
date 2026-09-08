import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { RichTextEditor } from './RichTextEditor';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	usePathname: () => '/super-admin/conteudo',
}));

async function setup(value = '<p>Olá</p>') {
	mockFetch([
		[
			'/api/super-admin/cms/media',
			() => jsonResponse({ data: [], pagination: { page: 1, limit: 24, total: 0, pageCount: 1 } }),
		],
	]);
	const onChange = vi.fn();
	const { user } = renderWithProviders(<RichTextEditor value={value} onChange={onChange} />);
	const editor = await screen.findByRole('textbox', { name: /conteúdo/i });
	await user.click(editor);
	await user.keyboard('{Control>}a{/Control}');

	return { user, onChange, editor };
}

describe('RichTextEditor toolbar', { timeout: 30_000 }, () => {
	it.each([
		[/itálico/i, '<em>'],
		[/título \(h2\)/i, '<h2>'],
		[/subtítulo \(h3\)/i, '<h3>'],
		[/lista numerada/i, '<ol>'],
		[/citação/i, '<blockquote>'],
		[/^código$/i, '<pre>'],
	])('applies %s to the selection', async (label, tag) => {
		const { user, onChange } = await setup();

		await user.click(screen.getByRole('button', { name: label }));

		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining(tag)));
	});

	it('inserts, edits and removes a link through the inline address bar', async () => {
		const { user, onChange } = await setup();

		await user.click(screen.getByRole('button', { name: /inserir link/i }));
		await user.type(screen.getByRole('textbox', { name: /endereço do link/i }), 'https://ex.com{enter}');
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.stringContaining('href="https://ex.com"')));

		await user.click(screen.getByRole('button', { name: /editar link/i }));
		expect(screen.getByRole('textbox', { name: /endereço do link/i })).toHaveValue('https://ex.com');
		await user.click(screen.getByRole('button', { name: /cancelar/i }));
		expect(screen.queryByRole('textbox', { name: /endereço do link/i })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /remover link/i }));
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.not.stringContaining('href=')));
	});

	it('clears the link when the address is applied empty', async () => {
		const { user, onChange } = await setup('<p><a href="https://ex.com">Olá</a></p>');

		await user.click(screen.getByRole('button', { name: /editar link/i }));
		await user.clear(screen.getByRole('textbox', { name: /endereço do link/i }));
		await user.click(screen.getByRole('button', { name: /aplicar/i }));

		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(expect.not.stringContaining('href=')));
	});

	it('undoes and redoes the last change', async () => {
		const { user, onChange } = await setup();

		await user.click(screen.getByRole('button', { name: /negrito/i }));
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p><strong>Olá</strong></p>'));
		await user.click(screen.getByRole('button', { name: /desfazer/i }));
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p>Olá</p>'));
		await user.click(screen.getByRole('button', { name: /refazer/i }));
		await waitFor(() => expect(onChange).toHaveBeenLastCalledWith('<p><strong>Olá</strong></p>'));
	});

	it('opens the media library to insert an image', async () => {
		const { user } = await setup();

		await user.click(screen.getByRole('button', { name: /inserir imagem/i }));

		expect(await screen.findByRole('dialog')).toBeInTheDocument();
	});

	it('replaces the content when the value changes from outside', async () => {
		const onChange = vi.fn();
		const { rerender } = renderWithProviders(<RichTextEditor value="<p>Um</p>" onChange={onChange} />);
		await screen.findByRole('textbox', { name: /conteúdo/i });

		rerender(<RichTextEditor value="<p>Dois</p>" onChange={onChange} />);

		await waitFor(() => expect(screen.getByRole('textbox', { name: /conteúdo/i })).toHaveTextContent('Dois'));
		expect(onChange).not.toHaveBeenCalled();
	});
});
