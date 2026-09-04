import { vi } from 'vitest';
import type { SupabaseClients } from '../../src/infrastructure/supabase/clients.js';

export interface QueryResult {
	data?: unknown;
	error?: unknown;
	count?: number | null;
}

/**
 * Builder de consulta falso: qualquer método encadeado (`select`, `eq`,
 * `order`, `range`, `maybeSingle`...) devolve o próprio builder, e o `await`
 * final resolve com o resultado configurado para a tabela. Serve para testar
 * rotas e repositórios sem um Supabase em execução.
 */
export function fakeQueryBuilder(result: QueryResult) {
	const resolved = { data: null, error: null, count: null, ...result };
	const builder: Record<string, unknown> = {};
	const handler: ProxyHandler<Record<string, unknown>> = {
		get(_target, property) {
			if (property === 'then') {
				return (onFulfilled: (value: QueryResult) => unknown, onRejected?: (reason: unknown) => unknown) =>
					Promise.resolve(resolved).then(onFulfilled, onRejected);
			}
			return vi.fn(() => proxy);
		},
	};
	const proxy: Record<string, unknown> = new Proxy(builder, handler);
	return proxy;
}

export interface SupabaseStubOptions {
	/** Resultado devolvido para cada tabela consultada via `from(table)`. */
	tables?: Record<string, QueryResult>;
	/** Resultado de `auth.getUser(token)`; padrão: sem sessão. */
	user?: { id: string; email: string } | null;
	/** Resultado de chamadas `rpc(name)`; padrão: `{ data: true }`. */
	rpc?: QueryResult;
}

/**
 * Cria um `SupabaseClients` de teste. O objetivo é montar a rota real com as
 * suas dependências concretas, substituindo apenas a borda de rede.
 */
export function createSupabaseClientsStub(options: SupabaseStubOptions = {}) {
	const { tables = {}, user = null, rpc = { data: true } } = options;
	const from = vi.fn((table: string) => fakeQueryBuilder(tables[table] ?? { data: null }));
	const getUser = vi.fn(async () =>
		user ? { data: { user }, error: null } : { data: { user: null }, error: { message: 'invalid token' } },
	);

	const admin = {
		from,
		rpc: vi.fn(async () => ({ data: null, error: null, ...rpc })),
		auth: { getUser, admin: { signOut: vi.fn(), updateUserById: vi.fn() } },
	};
	const publicClient = { from, auth: {} };
	const forAccessToken = vi.fn(() => ({ from, auth: { getUser } }));

	return {
		clients: { admin, public: publicClient, forAccessToken } as unknown as SupabaseClients,
		from,
		getUser,
	};
}
