import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders, jsonResponse, mockFetch } from '@/test';
import { BrandingAssetUploadField } from './BrandingAssetUploadField';
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
describe('branding file selection', () => {
	it('rejects raster logos and oversized SVGs before sending a request', async () => {
		const fetch = vi.fn();
		vi.stubGlobal('fetch', fetch);
		renderWithProviders(<BrandingAssetUploadField label="Logo" helper="Marca" value={null} onChange={vi.fn()} />);
		const user = userEvent.setup({ applyAccept: false });
		await user.upload(screen.getByLabelText('Logo'), new File(['png'], 'logo.png', { type: 'image/png' }));
		expect(screen.getByRole('alert')).toHaveTextContent('SVG vetorial');
		await user.upload(
			screen.getByLabelText('Logo'),
			new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.svg', { type: 'image/svg+xml' }),
		);
		expect(screen.getByRole('alert')).toHaveTextContent('no máximo 5 MB');
		expect(fetch).not.toHaveBeenCalled();
	});
	it('recovers from an upload response without JSON and allows a second attempt', async () => {
		const onChange = vi.fn();
		let attempt = 0;
		mockFetch([
			[
				'/api/super-admin/settings/branding/assets',
				() =>
					++attempt === 1
						? new Response('Service unavailable', { status: 503 })
						: jsonResponse({ fileId: 'icon', url: 'https://storage.test/icon.png' }),
			],
		]);
		const { user } = renderWithProviders(
			<BrandingAssetUploadField kind="app-icon" label="Ícone" helper="Aplicativo" value={null} onChange={onChange} />,
		);
		const file = new File(['png'], 'icon.png', { type: 'image/png' });
		await user.upload(screen.getByLabelText('Ícone'), file);
		expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível enviar o arquivo.');
		await user.upload(screen.getByLabelText('Ícone'), file);
		expect(onChange).toHaveBeenCalledWith({ id: 'icon', url: 'https://storage.test/icon.png' });
	});
});
