import type { AppUser, Organizer } from '@events-manager/contracts';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type AuthUser = AppUser & { email: string };
export type OrganizerProfile = Organizer;

export interface AuthState {
  user: AuthUser;
  isOrganizer: boolean;
  isSuperAdmin: boolean;
  organizerProfile?: OrganizerProfile;
  organizerStatus?: OrganizerProfile['status'];
  hasPendingOrganizerRequest?: boolean;
}

export async function requireSuperAdmin(): Promise<AuthState> {
  const auth = await requireAuth('/super-admin');
  if (!auth.isSuperAdmin || auth.user.role !== 'super_admin') redirect('/admin');

  return auth;
}

export async function getServerAuth(): Promise<AuthState | null> {
  const cookieStore = await cookies();
  if (!cookieStore.has('access_token')) return null;

  try {
    const response = await fetch(`${process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:3333'}/api/auth/me`, {
      headers: { cookie: cookieStore.toString() },
      cache: 'no-store',
    });
    if (!response.ok) return null;
    

return response.json() as Promise<AuthState>;
  } catch (error) {
    console.warn('A API de autenticação não está disponível.', error);
    

return null;
  }
}

export async function requireAuth(redirectTo?: string): Promise<AuthState> {
  const auth = await getServerAuth();
  if (!auth) redirect(redirectTo ? `/login?redirect=${encodeURIComponent(redirectTo)}` : '/login');
  

return auth;
}

export async function requireOrganizer(): Promise<{ user: AuthUser; organizer: OrganizerProfile }> {
  const auth = await requireAuth();
  if (!auth.isOrganizer || !auth.organizerProfile) redirect('/perfil');
  

return { user: auth.user, organizer: auth.organizerProfile };
}

export async function requireUser(): Promise<{ user: AuthUser }> {
  const auth = await requireAuth();
  

return { user: auth.user };
}

export async function isAuthenticated(): Promise<boolean> {

  return (await getServerAuth()) !== null;
}
