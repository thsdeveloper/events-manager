import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse } from '@/test';
import { openEvent } from './openEvent';

describe('abrir um evento salvo', () => {
	it('atualiza a seleção antes de abrir o evento recém-criado para não cair no filtro anterior', async () => {
		let selected = 'old';
		const fetchMock = mockFetch([
			[
				'/api/organizer/event-selection',
				(_url, init) => {
					selected = JSON.parse(String(init?.body)).eventId;

					return jsonResponse({ selectedEventId: selected });
				},
			],
		]);
		const router = { push: vi.fn(() => expect(selected).toBe('new')), refresh: vi.fn() };
		await openEvent(router, 'new', 'old');
		expect(fetchMock).toHaveBeenCalledOnce();
		expect(router.push).toHaveBeenCalledWith('/admin/eventos/new');
		expect(router.refresh).toHaveBeenCalledOnce();
	});
	it.each([null, 'new'])('preserva a visão atual quando já permite abrir o evento: %s', async (selection) => {
		const fetchMock = mockFetch([]);
		const router = { push: vi.fn(), refresh: vi.fn() };
		await openEvent(router, 'new', selection);
		expect(fetchMock).not.toHaveBeenCalled();
		expect(router.push).toHaveBeenCalledWith('/admin/eventos/new');
	});
	it('não navega com uma seleção inconsistente se a atualização falha', async () => {
		mockFetch([['/api/organizer/event-selection', () => problemResponse(503, 'UNAVAILABLE', 'Tente novamente.')]]);
		const router = { push: vi.fn(), refresh: vi.fn() };
		await expect(openEvent(router, 'new', 'old')).rejects.toThrow('Tente novamente.');
		expect(router.push).not.toHaveBeenCalled();
	});
});
