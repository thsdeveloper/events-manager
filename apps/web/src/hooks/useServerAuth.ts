'use client';

import { useEffect, useSyncExternalStore } from 'react';
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
	isSuperAdmin: boolean;
	organizerStatus: string | null;
	hasPendingOrganizerRequest: boolean;
}

type SessionSnapshot = Omit<ServerAuthState, 'isAuthenticated'>;

const signedOut: SessionSnapshot = {
	user: null,
	isLoading: false,
	isOrganizer: false,
	isSuperAdmin: false,
	organizerStatus: null,
	hasPendingOrganizerRequest: false,
};

/**
 * One session for the whole page. The header, the profile page and the
 * protected routes all read the same snapshot, so a change made on one screen
 * (a new profile photo, for instance) shows up everywhere at once instead of
 * waiting for a reload. Module state rather than a provider: consumers live in
 * different layouts and none of them should have to be wrapped to agree.
 */
let snapshot: SessionSnapshot = { ...signedOut, isLoading: true };
let loaded = false;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function publish(next: Partial<SessionSnapshot>) {
	snapshot = { ...snapshot, ...next };
	for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
	listeners.add(listener);

	return () => {
		listeners.delete(listener);
	};
}

function readSnapshot() {
	return snapshot;
}

async function load() {
	if (inFlight) return inFlight;
	inFlight = (async () => {
		try {
			const response = await fetch('/api/auth/me');
			if (!response.ok) {
				if (response.status === 401) {
					publish(signedOut);

					return;
				}
				throw new Error('Failed to fetch user');
			}
			const data = await response.json();
			publish({
				user: data.user,
				isLoading: false,
				isOrganizer: Boolean(data.isOrganizer),
				isSuperAdmin: Boolean(data.isSuperAdmin),
				organizerStatus: data.organizerStatus ?? null,
				hasPendingOrganizerRequest: Boolean(data.hasPendingOrganizerRequest),
			});
		} catch {
			publish(signedOut);
		} finally {
			loaded = true;
			inFlight = null;
		}
	})();

	return inFlight;
}

/** Test helper: forgets the session so each test starts from a fresh page load. */
export function resetServerAuthStore() {
	snapshot = { ...signedOut, isLoading: true };
	loaded = false;
	inFlight = null;
}

/**
 * Hook for Client Components to access server-side authentication state.
 *
 * - Reads authentication from httpOnly cookies (via API endpoint), once per page.
 * - `updateUser` applies a change locally and immediately (every consumer sees
 *   it); `refresh` reloads the session from the API for everyone.
 * - Provides logout functionality.
 *
 * For login/register, use the API routes directly.
 */
export function useServerAuth(): ServerAuthState & {
	logout: () => Promise<void>;
	refresh: () => Promise<void>;
	updateUser: (patch: Partial<User>) => void;
} {
	const session = useSyncExternalStore(subscribe, readSnapshot, readSnapshot);
	const router = useRouter();

	useEffect(() => {
		if (!loaded && !inFlight) void load();
	}, []);

	const logout = async () => {
		try {
			await fetch('/api/auth/logout', { method: 'POST' });
			publish(signedOut);
			router.push('/login');
			router.refresh();
		} catch {
			// The session remains unchanged; the next authenticated request will retry.
		}
	};

	const refresh = () => load();

	const updateUser = (patch: Partial<User>) => {
		const current = snapshot.user;
		if (current) publish({ user: { ...current, ...patch } });
		else if (patch.id && patch.email) publish({ user: patch as User, isLoading: false });
	};

	return {
		...session,
		isAuthenticated: Boolean(session.user),
		logout,
		refresh,
		updateUser,
	};
}
