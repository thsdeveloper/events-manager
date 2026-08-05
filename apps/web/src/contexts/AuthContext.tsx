'use client';

import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  refreshAuth: () => Promise<void>;
  getAccessToken: () => null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function readError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null);
  
return body?.detail ?? body?.error ?? fallback;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'include' });
      setUser(response.ok ? (await response.json()).user : null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!response.ok) throw new Error(await readError(response, 'Falha ao fazer login.'));
    setUser((await response.json()).user);
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null);
    window.location.href = '/login';
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, first_name: firstName, last_name: lastName }),
    });
    if (!response.ok) throw new Error(await readError(response, 'Falha ao criar conta.'));
    setUser((await response.json()).user);
  };

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, register, refreshAuth: checkAuth, getAccessToken: () => null }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  
return context;
}
