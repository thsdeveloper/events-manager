import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { BrandingSettingsForm } from './BrandingSettingsForm';
vi.mock('next/cache', () => ({ revalidateTag: vi.fn() }));
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
const initial = {
	id: 'site',
	title: 'Flouvi',
	logo: null,
	logo_dark_mode: null,
	favicon: null,
	favicon_dark_mode: null,
	app_icon: null,
	app_icon_dark_mode: null,
	app_icon_tinted: null,
};
describe('BrandingSettingsForm', () => {
	it('offers separate SVG logos, favicons and the three application icon variants', () => {
		renderWithProviders(<BrandingSettingsForm initialSettings={initial} />);
		for (const label of [
			'Logo (tema claro)',
			'Logo (tema escuro)',
			'Favicon padrão',
			'Favicon escuro',
			'Ícone padrão',
			'Ícone escuro',
			'Ícone tonal',
		])
			expect(screen.getByLabelText(label)).toHaveAttribute('type', 'file');
	});
	it('uploads the original SVG without cropping and saves its media identifier', async () => {
		let uploaded: File | undefined;
		let saved: Record<string, unknown> | undefined;
		mockFetch([
			[
				'/api/super-admin/settings/branding/assets',
				(_url, init) => {
					uploaded = (init?.body as FormData).get('file') as File;

					return jsonResponse({ fileId: 'logo-id', url: 'https://storage.test/logo.svg' });
				},
			],
			[
				'/api/super-admin/settings/branding',
				(_url, init) => {
					saved = JSON.parse(String(init?.body));

					return jsonResponse({ success: true });
				},
			],
		]);
		const { user } = renderWithProviders(<BrandingSettingsForm initialSettings={initial} />);
		const file = new File(['<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80"/>'], 'logo.svg', {
			type: 'image/svg+xml',
		});
		await user.upload(screen.getByLabelText('Logo (tema claro)'), file);
		await screen.findByAltText('Prévia: Logo (tema claro)');
		expect(uploaded).toBe(file);
		expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		await user.click(screen.getByRole('button', { name: 'Salvar identidade visual' }));
		await waitFor(() =>
			expect(saved).toMatchObject({ logo: 'logo-id', app_icon: null, app_icon_dark_mode: null, app_icon_tinted: null }),
		);
		await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar identidade visual' })).toBeDisabled());
	});
	it('keeps the previous logo on upload failure and permits an explicit removal', async () => {
		let saved: Record<string, unknown> | undefined;
		mockFetch([
			['/api/super-admin/settings/branding/assets', () => jsonResponse({ detail: 'SVG inválido.' }, { status: 422 })],
			[
				'/api/super-admin/settings/branding',
				(_url, init) => {
					saved = JSON.parse(String(init?.body));

					return jsonResponse({ success: true });
				},
			],
		]);
		const { user } = renderWithProviders(
			<BrandingSettingsForm initialSettings={{ ...initial, logo: { id: 'old-logo', path: 'old-logo.png' } }} />,
		);
		await user.upload(
			screen.getByLabelText('Logo (tema claro)'),
			new File(['invalid'], 'logo.svg', { type: 'image/svg+xml' }),
		);
		expect(await screen.findByText('SVG inválido.')).toBeInTheDocument();
		expect(screen.getByAltText('Prévia: Logo (tema claro)')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Salvar identidade visual' })).toBeDisabled();
		await user.click(screen.getByRole('button', { name: 'Remover Logo (tema claro)' }));
		await user.click(screen.getByRole('button', { name: 'Salvar identidade visual' }));
		await waitFor(() => expect(saved?.logo).toBeNull());
	});
	it('reports a save failure and retains pending changes for retry', async () => {
		mockFetch([
			[
				'/api/super-admin/settings/branding',
				() => jsonResponse({ detail: 'Não foi possível salvar.' }, { status: 503 }),
			],
		]);
		const { user } = renderWithProviders(
			<BrandingSettingsForm initialSettings={{ ...initial, app_icon: { id: 'app', path: 'app.png' } }} />,
		);
		await user.click(screen.getByRole('button', { name: 'Remover Ícone padrão' }));
		await user.click(screen.getByRole('button', { name: 'Salvar identidade visual' }));
		expect(await screen.findByText('Não foi possível salvar.')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Salvar identidade visual' })).toBeEnabled();
	});
});
