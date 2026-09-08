import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderWithProviders } from '@/test';
import type { CmsSiteSettings } from '../types';
import { SiteSettingsForm } from './SiteSettingsForm';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));
const revalidate = vi.hoisted(() => vi.fn());
vi.mock('../api/actions', () => ({ revalidateCmsContent: revalidate }));

afterEach(() => vi.unstubAllGlobals());

const settings: CmsSiteSettings = {
	id: 's1',
	title: 'Events Manager',
	description: 'Descubra eventos.',
	tagline: null,
	url: 'https://eventos.local',
	social_links: [{ service: 'instagram', url: 'https://instagram.com/eventos' }],
	accent_color: '#6644ff',
	favicon: null,
	logo: null,
	logo_dark_mode: null,
	default_og_image: null,
	date_updated: null,
};

describe('SiteSettingsForm', () => {
	it('rejects an accent colour that is not #rrggbb before saving', async () => {
		const fetchMock = mockFetch([]);
		const { user } = renderWithProviders(<SiteSettingsForm settings={settings} />);

		const hex = screen.getByLabelText(/cor de destaque \(hex\)/i);
		await user.clear(hex);
		await user.type(hex, 'roxo');
		await user.click(screen.getByRole('button', { name: /salvar configurações/i }));

		expect(await screen.findByText('Use uma cor no formato #rrggbb')).toBeInTheDocument();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it('saves the identity, social links and media ids in one request', async () => {
		const fetchMock = mockFetch([['/api/super-admin/cms/site', () => jsonResponse(settings)]]);
		const { user } = renderWithProviders(<SiteSettingsForm settings={settings} />);

		const title = screen.getByLabelText(/nome do site/i);
		await user.clear(title);
		await user.type(title, 'Eventos BR');
		await user.click(screen.getByRole('button', { name: /salvar configurações/i }));

		await waitFor(() => expect(refresh).toHaveBeenCalled());
		const [, init] = fetchMock.mock.calls[0];
		expect(init?.method).toBe('PATCH');
		expect(JSON.parse(String(init?.body))).toEqual({
			title: 'Eventos BR',
			description: 'Descubra eventos.',
			tagline: null,
			url: 'https://eventos.local',
			accent_color: '#6644ff',
			social_links: [{ service: 'instagram', url: 'https://instagram.com/eventos' }],
			favicon: null,
			logo: null,
			logo_dark_mode: null,
			default_og_image: null,
		});
		expect(revalidate).toHaveBeenCalled();
	});

	it('edits the copy, the colour and the social links before saving', { timeout: 30_000 }, async () => {
		const fetchMock = mockFetch([['/api/super-admin/cms/site', () => jsonResponse(settings)]]);
		const { user } = renderWithProviders(<SiteSettingsForm settings={settings} />);

		await user.type(screen.getByLabelText(/tagline/i), 'Eventos que conectam');
		await user.clear(screen.getByLabelText(/descrição/i));
		await user.type(screen.getByLabelText(/descrição/i), 'Plataforma de eventos');
		await user.clear(screen.getByLabelText(/url pública/i));
		await user.type(screen.getByLabelText(/url pública/i), 'https://eventos.com.br');
		fireEvent.change(screen.getByLabelText(/escolher cor de destaque/i), { target: { value: '#112233' } });
		await user.click(screen.getByRole('button', { name: /adicionar rede/i }));
		const urls = screen.getAllByLabelText(/^url$/i);
		await user.type(urls[1], 'https://instagram.com/novo');
		await user.click(screen.getAllByRole('button', { name: /remover instagram/i })[0]);
		await user.click(screen.getByRole('button', { name: /salvar configurações/i }));

		await waitFor(() => expect(revalidate).toHaveBeenCalled());
		expect(JSON.parse(String(fetchMock.mock.calls.at(-1)?.[1]?.body))).toMatchObject({
			tagline: 'Eventos que conectam',
			description: 'Plataforma de eventos',
			url: 'https://eventos.com.br',
			accent_color: '#112233',
			social_links: [{ service: 'instagram', url: 'https://instagram.com/novo' }],
		});
	});

	it('shows the API problem and its field errors when the save is refused', async () => {
		mockFetch([
			[
				'/api/super-admin/cms/site',
				() =>
					problemResponse(422, 'VALIDATION_ERROR', 'Os dados enviados são inválidos.', {
						errors: { fieldErrors: { url: ['URL recusada pela API'] } },
					}),
			],
		]);
		const { user } = renderWithProviders(<SiteSettingsForm settings={settings} />);

		await user.click(screen.getByRole('button', { name: /salvar configurações/i }));

		expect(await screen.findByText('URL recusada pela API')).toBeInTheDocument();
		expect(revalidate).not.toHaveBeenCalled();
	});
});
