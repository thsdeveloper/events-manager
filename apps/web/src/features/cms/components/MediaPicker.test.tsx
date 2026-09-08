import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders, userEvent } from '@/test';
import { MediaPicker } from './MediaPicker';

vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

afterEach(() => vi.unstubAllGlobals());

const libraryFile = {
	id: '11111111-1111-4111-8111-111111111111',
	bucket: 'media',
	path: 'cms/banner.png',
	filename: 'banner.png',
	title: 'Banner',
	type: 'image/png',
	filesize: 1024,
	width: 800,
	height: 600,
};

const emptyLibrary = () => jsonResponse({ data: [], pagination: { page: 1, limit: 24, total: 0, pageCount: 0 } });
const uploadCalls = (fetchMock: ReturnType<typeof mockFetch>) =>
	fetchMock.mock.calls.filter(([url]) => String(url).includes('/api/upload'));

describe('MediaPicker', () => {
	it('refuses a file that is not an accepted image before touching the network', { timeout: 20_000 }, async () => {
		const fetchMock = mockFetch([['/api/super-admin/cms/media', emptyLibrary]]);
		const onChange = vi.fn();
		// O input já filtra por `accept`; o teste ignora o filtro para exercitar a validação do componente.
		const user = userEvent.setup({ applyAccept: false });
		renderWithProviders(<MediaPicker value={null} onChange={onChange} label="Imagem de capa" />);

		await user.click(screen.getByRole('button', { name: /escolher imagem de capa/i }));
		await user.click(await screen.findByRole('tab', { name: /enviar/i }));
		const input = screen.getByLabelText(/arquivo/i) as HTMLInputElement;
		await user.upload(input, new File(['x'], 'doc.txt', { type: 'text/plain' }));

		expect(await screen.findByRole('alert')).toHaveTextContent(/PNG, JPEG, WebP ou GIF/i);
		expect(uploadCalls(fetchMock)).toHaveLength(0);
		expect(onChange).not.toHaveBeenCalled();
	});

	it('refuses a file above 20 MB', async () => {
		const fetchMock = mockFetch([['/api/super-admin/cms/media', emptyLibrary]]);
		const { user } = renderWithProviders(<MediaPicker value={null} onChange={vi.fn()} label="Imagem" />);

		await user.click(screen.getByRole('button', { name: /escolher imagem/i }));
		await user.click(await screen.findByRole('tab', { name: /enviar/i }));
		const big = new File(['x'], 'big.png', { type: 'image/png' });
		Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
		await user.upload(screen.getByLabelText(/arquivo/i), big);

		expect(await screen.findByRole('alert')).toHaveTextContent(/20 MB/);
		expect(uploadCalls(fetchMock)).toHaveLength(0);
	});

	it('uploads a valid image to the CMS folder and hands the stored file back', async () => {
		const fetchMock = mockFetch([
			['/api/super-admin/cms/media', emptyLibrary],
			[
				'/api/upload?folder=cms',
				() =>
					jsonResponse(
						{ fileId: libraryFile.id, filename: 'banner.png', url: 'x', file: libraryFile },
						{ status: 201 },
					),
			],
		]);
		const onChange = vi.fn();
		const { user } = renderWithProviders(<MediaPicker value={null} onChange={onChange} label="Imagem" />);

		await user.click(screen.getByRole('button', { name: /escolher imagem/i }));
		await user.click(await screen.findByRole('tab', { name: /enviar/i }));
		await user.upload(screen.getByLabelText(/arquivo/i), new File(['png'], 'banner.png', { type: 'image/png' }));

		await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: libraryFile.id })));
		const [, init] = uploadCalls(fetchMock)[0];
		expect(init?.method).toBe('POST');
		expect(init?.body).toBeInstanceOf(FormData);
		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
	});

	it('lets the person pick an existing file from the library and clear it afterwards', async () => {
		mockFetch([
			[
				'/api/super-admin/cms/media',
				() => jsonResponse({ data: [libraryFile], pagination: { page: 1, limit: 24, total: 1, pageCount: 1 } }),
			],
		]);
		const onChange = vi.fn();
		const { user, rerender } = renderWithProviders(<MediaPicker value={null} onChange={onChange} label="Imagem" />);

		await user.click(screen.getByRole('button', { name: /escolher imagem/i }));
		const dialog = await screen.findByRole('dialog');
		await user.click(await within(dialog).findByRole('button', { name: /banner/i }));

		expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ id: libraryFile.id }));

		rerender(<MediaPicker value={libraryFile} onChange={onChange} label="Imagem" />);
		expect(screen.getByRole('img', { name: /banner/i })).toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: /remover imagem/i }));
		expect(onChange).toHaveBeenLastCalledWith(null);
	});
});
