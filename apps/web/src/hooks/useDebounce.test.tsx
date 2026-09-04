/**
 * Exemplo de referência do ciclo TDD para hooks (projeto `dom`).
 * Timers falsos tornam o teste determinístico e instantâneo.
 */
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	it('returns the initial value immediately', () => {
		const { result } = renderHook(() => useDebounce('a', 300));

		expect(result.current).toBe('a');
	});

	it('only exposes the latest value after the delay has elapsed without changes', () => {
		const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
			initialProps: { value: 'a' },
		});

		rerender({ value: 'ab' });
		act(() => vi.advanceTimersByTime(200));
		rerender({ value: 'abc' });
		act(() => vi.advanceTimersByTime(200));

		expect(result.current).toBe('a');

		act(() => vi.advanceTimersByTime(100));

		expect(result.current).toBe('abc');
	});
});
