import { act, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, problemResponse, renderHookWithProviders } from '@/test';
import { resetServerAuthStore, useServerAuth } from './useServerAuth';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

afterEach(() => {
	vi.unstubAllGlobals();
	resetServerAuthStore();
});

const session = (avatar: string | null) => ({
	user: { id: 'u1', email: 'ana@example.com', first_name: 'Ana', last_name: null, role: 'attendee', avatar },
	isOrganizer: false,
	isSuperAdmin: false,
	organizerStatus: null,
	hasPendingOrganizerRequest: false,
});

describe('useServerAuth shared session', () => {
	it('loads the session once and shares it with every consumer', async () => {
		const fetchMock = mockFetch([['/api/auth/me', () => jsonResponse(session(null))]]);

		const header = renderHookWithProviders(() => useServerAuth());
		const page = renderHookWithProviders(() => useServerAuth());

		await waitFor(() => expect(header.result.current.isLoading).toBe(false));
		await waitFor(() => expect(page.result.current.isLoading).toBe(false));
		expect(fetchMock).toHaveBeenCalledTimes(1);
		expect(header.result.current.user?.id).toBe('u1');
		expect(page.result.current.user?.id).toBe('u1');
	});

	it('shows an update made on one screen immediately on every other consumer', async () => {
		mockFetch([['/api/auth/me', () => jsonResponse(session(null))]]);
		const header = renderHookWithProviders(() => useServerAuth());
		const page = renderHookWithProviders(() => useServerAuth());
		await waitFor(() => expect(page.result.current.isLoading).toBe(false));

		act(() => page.result.current.updateUser({ avatar: 'media-2' }));

		expect(header.result.current.user?.avatar).toBe('media-2');
	});

	it('propagates a refresh to every consumer', async () => {
		let avatar: string | null = null;
		mockFetch([['/api/auth/me', () => jsonResponse(session(avatar))]]);
		const header = renderHookWithProviders(() => useServerAuth());
		const page = renderHookWithProviders(() => useServerAuth());
		await waitFor(() => expect(page.result.current.isLoading).toBe(false));

		avatar = 'media-3';
		await act(() => page.result.current.refresh());

		expect(header.result.current.user?.avatar).toBe('media-3');
	});
});

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
