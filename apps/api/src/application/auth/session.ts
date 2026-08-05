import type { User } from '@supabase/supabase-js';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { ApiEnv } from '../../config/env.js';
import type { SupabaseClients } from '../../infrastructure/supabase/clients.js';
import { ApiError } from '../../shared/errors.js';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

export interface AuthContext {
  accessToken: string;
  user: User;
}

export function readAccessToken(request: FastifyRequest): string | null {
  const cookieToken = request.cookies[ACCESS_COOKIE];
  if (cookieToken) return cookieToken;
  const authorization = request.headers.authorization;
  if (authorization?.startsWith('Bearer ')) return authorization.slice(7);
  return null;
}

export async function requireUser(request: FastifyRequest, clients: SupabaseClients): Promise<AuthContext> {
  const accessToken = readAccessToken(request);
  if (!accessToken) throw new ApiError('Você precisa estar autenticado.', 401, 'UNAUTHORIZED');

  const { data, error } = await clients.admin.auth.getUser(accessToken);
  if (error || !data.user) throw new ApiError('Sua sessão expirou. Entre novamente.', 401, 'INVALID_SESSION');

  return { accessToken, user: data.user };
}

export function setSessionCookies(
  reply: FastifyReply,
  env: ApiEnv,
  session: { access_token: string; refresh_token: string; expires_in: number },
) {
  const common = {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };

  reply.setCookie(ACCESS_COOKIE, session.access_token, { ...common, maxAge: session.expires_in });
  reply.setCookie(REFRESH_COOKIE, session.refresh_token, { ...common, maxAge: 60 * 60 * 24 * 30 });
}

export function clearSessionCookies(reply: FastifyReply, env: ApiEnv) {
  const options = {
    path: '/',
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
  };
  reply.clearCookie(ACCESS_COOKIE, options);
  reply.clearCookie(REFRESH_COOKIE, options);
}

export async function serializeUser(clients: SupabaseClients, user: User) {
  const { data: profile } = await clients.admin.from('profiles').select('*').eq('id', user.id).maybeSingle();
  const { data: organizer } = await clients.admin
    .from('organizers')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? profile?.email ?? null,
    first_name: profile?.first_name ?? user.user_metadata?.first_name ?? null,
    last_name: profile?.last_name ?? user.user_metadata?.last_name ?? null,
    avatar: profile?.avatar ?? null,
    role: profile?.role ?? 'attendee',
    status: profile?.status ?? 'active',
    organizer: organizer ?? null,
  };
}

export async function requireSuperAdmin(request: FastifyRequest, clients: SupabaseClients) {
  const auth = await requireUser(request, clients);
  const { data: profile, error } = await clients.admin
    .from('profiles')
    .select('*')
    .eq('id', auth.user.id)
    .maybeSingle();
  if (error) throw error;
  if (!profile || profile.role !== 'super_admin' || profile.status !== 'active') {
    throw new ApiError('Acesso exclusivo para super administradores.', 403, 'SUPER_ADMIN_REQUIRED');
  }
  return { ...auth, profile };
}
