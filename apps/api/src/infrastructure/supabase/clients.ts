import { createClient, type SupabaseClient, type WebSocketLikeConstructor } from '@supabase/supabase-js';
import WebSocket from 'ws';
import type { ApiEnv } from '../../config/env.js';

const serverWebSocketTransport = WebSocket as unknown as WebSocketLikeConstructor;

const serverAuthOptions = {
	auth: {
		autoRefreshToken: false,
		persistSession: false,
		detectSessionInUrl: false,
	},
	// Node.js anteriores ao 22 não expõem WebSocket nativo. O Supabase
	// inicializa o cliente Realtime mesmo quando usamos apenas Auth/PostgREST.
	realtime: {
		transport: serverWebSocketTransport,
	},
} as const;

export interface SupabaseClients {
	public: SupabaseClient;
	admin: SupabaseClient;
	forAccessToken: (accessToken: string) => SupabaseClient;
}

export function createSupabaseClients(env: ApiEnv): SupabaseClients {
	return {
		public: createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, serverAuthOptions),
		admin: createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, serverAuthOptions),
		// O header vale para PostgREST/Storage, onde o RLS lê o JWT da requisição.
		// Os métodos de `auth.*` NÃO o enxergam: eles usam a sessão interna do
		// GoTrueClient, vazia aqui por persistSession: false — `auth.updateUser()`
		// falha com AuthSessionMissingError. Para agir sobre o usuário do token, use
		// `admin.auth.getUser(token)` e depois o cliente admin.
		forAccessToken: (accessToken) =>
			createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
				...serverAuthOptions,
				global: { headers: { Authorization: `Bearer ${accessToken}` } },
			}),
	};
}
