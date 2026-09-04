import { waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { useServerAuth } from './useServerAuth';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => vi.unstubAllGlobals());

describe('useServerAuth', () => {
	it('exposes the roles the API resolved for the session', async () => {
		mockFetch([
			[
				'/api/auth/me',
				() =>
					jsonResponse({
						user: { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: null, role: 'super_admin' },
						isOrganizer: true,
						isSuperAdmin: true,
						organizerStatus: 'active',
						hasPendingOrganizerRequest: false,
					}),
			],
		]);

		const { result } = renderHookWithProviders(() => useServerAuth());

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.isAuthenticated).toBe(true);
		expect(result.current.isOrganizer).toBe(true);
		expect(result.current.isSuperAdmin).toBe(true);
	});

	it('treats a missing session as a plain visitor', async () => {
		mockFetch([['/api/auth/me', () => problemResponse(401, 'UNAUTHORIZED')]]);

		const { result } = renderHookWithProviders(() => useServerAuth());

		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.isAuthenticated).toBe(false);
		expect(result.current.isOrganizer).toBe(false);
		expect(result.current.isSuperAdmin).toBe(false);
	});
});
