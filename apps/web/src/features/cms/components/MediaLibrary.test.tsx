import { screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import type { CmsMedia } from '../types';
import { MediaLibrary } from './MediaLibrary';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

const file: CmsMedia = {
	id: '11111111-1111-4111-8111-111111111111',
	bucket: 'media',
	path: 'cms/banner.png',
	filename: 'banner.png',
	title: 'Banner',
	description: null,
	type: 'image/png',
	filesize: 2048,
	width: 800,
	height: 600,
	uploaded_by: null,
	date_created: '2026-09-01T00:00:00Z',
};

describe('MediaLibrary', () => {
	it('updates the title and description of a file', async () => {
		const fetchMock = mockFetch([
			[`/api/super-admin/cms/media/${file.id}`, () => jsonResponse({ ...file, title: 'Capa' })],
		]);
		const { user } = renderWithProviders(<MediaLibrary media={[file]} />);

		await user.click(screen.getByRole('button', { name: /editar banner/i }));
		const sheet = await screen.findByRole('dialog');
		const title = within(sheet).getByLabelText(/título/i);
		await user.clear(title);
		await user.type(title, 'Capa');
		await user.type(within(sheet).getByLabelText(/descrição/i), 'Capa da home');
		await user.click(within(sheet).getByRole('button', { name: /salvar/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('PATCH');
		expect(JSON.parse(String(init?.body))).toEqual({ title: 'Capa', description: 'Capa da home' });
	});

	it('warns that references go empty before deleting a file', async () => {
		const fetchMock = mockFetch([[`/api/super-admin/cms/media/${file.id}`, () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(<MediaLibrary media={[file]} />);

		await user.click(screen.getByRole('button', { name: /excluir banner/i }));
		const dialog = await screen.findByRole('alertdialog');
		expect(dialog).toHaveTextContent(/ficam vazi/i);
		await user.click(within(dialog).getByRole('button', { name: /^excluir$/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		expect(fetchMock.mock.calls[0][1]?.method).toBe('DELETE');
		expect(revalidate).toHaveBeenCalled();
	});
});
