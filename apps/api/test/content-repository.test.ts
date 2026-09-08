import { describe, expect, it } from 'vitest';
import { SupabaseContentRepository } from '../src/infrastructure/supabase/content-repository.js';
import { createSupabaseClientsStub } from './support/index.js';

describe('SupabaseContentRepository.listPosts', () => {
	it('answers a page beyond the archive with an empty list instead of failing', async () => {
		// PostgREST rejeita um range fora do acervo com PGRST103.
		const { clients } = createSupabaseClientsStub({
			tables: { posts: [{ error: { code: 'PGRST103', message: 'Requested range not satisfiable' } }, { count: 7 }] },
		});

		const result = await new SupabaseContentRepository(clients.admin).listPosts(6, 9);

		expect(result).toEqual({ data: [], total: 7, page: 9, limit: 6 });
	});
});
