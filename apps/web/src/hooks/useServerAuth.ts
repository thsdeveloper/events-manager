'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@events-manager/contracts';

type User = Omit<AppUser, 'email' | 'first_name' | 'last_name'> & {
	email: string;
	first_name: string | null;
	last_name: string | null;
};

interface ServerAuthState {
	user: User | null;
	isLoading: boolean;
	isAuthenticated: boolean;
	isOrganizer: boolean;
	organizerStatus: string | null;
	hasPendingOrganizerRequest: boolean;
}

/**
 * Hook for Client Components to access server-side authentication state
 * Replaces the old useAuth() hook from AuthContext
 *
 * This hook:
 * - Reads authentication from httpOnly cookies (via API endpoint)
 * - Provides logout functionality
 * - Automatically redirects to login on 401 errors
 *
 * Note: For login/register, use the API routes directly:
 * - POST /api/auth/login
 * - POST /api/auth/register
 */
export function useServerAuth(): ServerAuthState & {
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
} {
	const [user, setUser] = useState<User | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [isOrganizer, setIsOrganizer] = useState(false);
	const [organizerStatus, setOrganizerStatus] = useState<string | null>(null);
	const [hasPendingOrganizerRequest, setHasPendingOrganizerRequest] = useState(false);
	const router = useRouter();

	const fetchUser = async () => {
		try {
			setIsLoading(true);
			const response = await fetch('/api/auth/me');

			if (!response.ok) {
				if (response.status === 401) {
					setUser(null);

					return;
				}
				throw new Error('Failed to fetch user');
			}

			const data = await response.json();
			setUser(data.user);
			setIsOrganizer(Boolean(data.isOrganizer));
			setOrganizerStatus(data.organizerStatus ?? null);
			setHasPendingOrganizerRequest(Boolean(data.hasPendingOrganizerRequest));
		} catch {
			setUser(null);
			setIsOrganizer(false);
			setOrganizerStatus(null);
			setHasPendingOrganizerRequest(false);
		} finally {
			setIsLoading(false);
		}
	};

	const logout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			setUser(null);
			router.push('/login');
			router.refresh();
		} catch {
			// The session remains unchanged; the next authenticated request will retry.
		}
	};

	const refresh = async () => {
		await fetchUser();
	};

	useEffect(() => {
		fetchUser();
	}, []);

	return {
		user,
		isLoading,
		isAuthenticated: !!user,
		isOrganizer,
		organizerStatus,
		hasPendingOrganizerRequest,
		logout,
		refresh,
	};
}
