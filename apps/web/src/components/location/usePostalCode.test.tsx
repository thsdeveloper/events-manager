import { act, renderHook } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { mockFetch, jsonResponse } from '@/test';
import { usePostalCode } from './usePostalCode';
const address = { street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP', postal_code: '01001000' };
afterEach(() => {
	vi.unstubAllGlobals();
	vi.useRealTimers();
});
describe('postal code lookup lifecycle', () => {
	it('does not repeat the lookup when the form rerenders with a new callback', async () => {
		vi.useFakeTimers();
		const fetch = mockFetch([['/api/places/postal-code/', () => jsonResponse(address)]]);
		const callback = vi.fn();
		const { rerender } = renderHook(({ onResolved }) => usePostalCode('01001000', true, onResolved), {
			initialProps: { onResolved: callback },
		});
		await act(async () => vi.advanceTimersByTimeAsync(300));
		expect(callback).toHaveBeenCalledOnce();
		rerender({ onResolved: vi.fn() });
		await act(async () => vi.advanceTimersByTimeAsync(1000));
		expect(fetch).toHaveBeenCalledOnce();
	});
	it('ignores a stale response after the organizer changes the postal code', async () => {
		vi.useFakeTimers();
		let finish!: (response: Response) => void;
		mockFetch([
			[
				'/api/places/postal-code/01001000',
				() =>
					new Promise<Response>((resolve) => {
						finish = resolve;
					}),
			],
			[
				'/api/places/postal-code/20040002',
				() => jsonResponse({ ...address, postal_code: '20040002', city: 'Rio de Janeiro', state: 'RJ' }),
			],
		]);
		const callback = vi.fn();
		const { rerender } = renderHook(({ code }) => usePostalCode(code, true, callback), {
			initialProps: { code: '01001000' },
		});
		await act(async () => vi.advanceTimersByTimeAsync(300));
		rerender({ code: '20040002' });
		await act(async () => vi.advanceTimersByTimeAsync(300));
		await act(async () => finish(jsonResponse(address)));
		expect(callback).toHaveBeenCalledOnce();
		expect(callback).toHaveBeenCalledWith(expect.objectContaining({ city: 'Rio de Janeiro' }));
	});
});
