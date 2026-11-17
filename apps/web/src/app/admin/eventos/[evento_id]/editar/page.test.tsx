import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditarEventoPage from './page';

const navigation = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => navigation }));

describe('event editing', () => {
	it('preserves event data, selected format and featured/free flags when saving', async () => {
		let saved: Record<string, unknown> | undefined;
		mockFetch([
			[
				'/api/events/event-1',
				(_url, init) => {
					if (init?.method === 'PATCH') {
						saved = JSON.parse(String(init.body));

						return jsonResponse({ id: 'event-1' });
					}

					return jsonResponse({
						id: 'event-1',
						title: 'Conferência',
						description: 'Conteúdo do evento',
						start_date: '2026-12-10T12:00:00Z',
						status: 'draft',
						event_type: 'in_person',
						is_free: false,
						featured: false,
						tags: ['tecnologia'],
						tickets: [],
					});
				},
			],
			['/api/event-categories', () => jsonResponse({ data: [] })],
		]);
		const { user } = renderWithProviders(<EditarEventoPage params={Promise.resolve({ evento_id: 'event-1' })} />);
		const title = await screen.findByPlaceholderText('Ex: Workshop de React Avançado');
		await user.clear(title);
		await user.type(title, 'Conferência atualizada');
		await user.click(screen.getByRole('radio', { name: /online/i }));
		await user.type(
			screen.getByPlaceholderText('https://zoom.us/j/123456789 ou https://meet.google.com/...'),
			'https://example.com/live',
		);
		await user.click(screen.getByLabelText(/destacar este evento/i));
		await user.click(screen.getByLabelText(/este é um evento gratuito/i));
		await user.click(screen.getByRole('button', { name: 'Salvar Alterações' }));
		await waitFor(() =>
			expect(saved).toMatchObject({
				title: 'Conferência atualizada',
				description: 'Conteúdo do evento',
				event_type: 'online',
				online_url: 'https://example.com/live',
				featured: true,
				is_free: true,
				tags: ['tecnologia'],
				status: 'draft',
			}),
		);
	});
});
