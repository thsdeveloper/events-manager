import { describe, expect, it, vi } from 'vitest';
import { mockFetch, problemResponse, jsonResponse } from '@/test';
import { getEventSelection } from './getEventSelection';
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ toString: () => 'access_token=test' }) }));
describe('selection after membership revocation', () => {
	it('lets the workspace shell render without retaining an unauthorized event', async () => {
		mockFetch([
			['/api/organizer/event-selection', () => problemResponse(403, 'ORGANIZER_REQUIRED', 'Vínculo removido.')],
		]);
		await expect(getEventSelection()).resolves.toEqual({ events: [], selectedEventId: null });
	});
	it('does not hide API failures as an empty authorization scope', async () => {
		mockFetch([['/api/organizer/event-selection', () => problemResponse(500, 'INTERNAL_ERROR', 'Unavailable')]]);
		await expect(getEventSelection()).rejects.toThrow();
	});
	it('preserves the server-selected authorized event', async () => {
		mockFetch([
			[
				'/api/organizer/event-selection',
				() => jsonResponse({ events: [{ id: 'event', title: 'Event' }], selectedEventId: 'event' }),
			],
		]);
		await expect(getEventSelection()).resolves.toMatchObject({ selectedEventId: 'event' });
	});
});
