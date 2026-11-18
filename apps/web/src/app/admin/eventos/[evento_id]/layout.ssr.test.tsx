import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch } from '@/test';
import EventLayout from './layout';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ toString: () => 'access_token=test' }) }));
vi.mock('next/navigation', () => ({
	redirect: (path: string) => {
		throw new Error(`redirect:${path}`);
	},
}));

describe('detalhes do evento no contexto global', () => {
	it('redireciona um favorito de outro evento para o evento selecionado', async () => {
		mockFetch([['/api/organizer/event-selection', () => jsonResponse({ events: [], selectedEventId: 'selected' })]]);
		await expect(
			EventLayout({ children: 'Detalhes antigos', params: Promise.resolve({ evento_id: 'old' }) }),
		).rejects.toThrow('redirect:/admin/eventos/selected');
	});
	it.each([null, 'selected'])('permite a página quando a seleção inclui o evento: %s', async (selectedEventId) => {
		mockFetch([['/api/organizer/event-selection', () => jsonResponse({ events: [], selectedEventId })]]);
		await expect(
			EventLayout({ children: 'Detalhes do evento', params: Promise.resolve({ evento_id: 'selected' }) }),
		).resolves.toBe('Detalhes do evento');
	});
});
