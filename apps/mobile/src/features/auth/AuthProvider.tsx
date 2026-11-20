import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppUser } from '@events-manager/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../shared/api';
import type { Session } from '../../shared/api/client';
type Result = { user: AppUser; session: Session };
const AuthContext = createContext<{
	user: AppUser | null;
	ready: boolean;
	accept: (result: Result) => Promise<void>;
	reload: () => Promise<void>;
	logout: () => Promise<void>;
} | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
	const [user, setUser] = useState<AppUser | null>(null);
	const [ready, setReady] = useState(false);
	const queries = useQueryClient();
	const identityVersion = useRef(0);
	const reload = async () => {
		const version = identityVersion.current;
		const result = await api.request<{ user: AppUser }>('/api/auth/me');
		if (version === identityVersion.current) setUser(result.user);
	};
	useEffect(() => {
		let alive = true;
		const version = identityVersion.current;
		void (async () => {
			try {
				if (await api.session()) {
					const r = await api.request<{ user: AppUser }>('/api/auth/me');
					if (alive && version === identityVersion.current) setUser(r.user);
				}
			} catch {
			} finally {
				if (alive) setReady(true);
			}
		})();
		const unsubscribe = api.subscribe((value) => {
			if (!value) {
				identityVersion.current++;
				setUser(null);
				queries.clear();
			}
		});
		return () => {
			alive = false;
			unsubscribe();
		};
	}, [queries]);
	const accept = async (result: Result) => {
		identityVersion.current++;
		await api.setSession(result.session);
		queries.clear();
		setUser(result.user);
	};
	const logout = async () => {
		identityVersion.current++;
		try {
			await api.request('/api/auth/logout', { method: 'POST' });
		} finally {
			await api.setSession(null);
			setUser(null);
			queries.clear();
		}
	};
	return <AuthContext.Provider value={{ user, ready, accept, reload, logout }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
	const value = useContext(AuthContext);
	if (!value) throw new Error('AuthProvider ausente');
	return value;
}
