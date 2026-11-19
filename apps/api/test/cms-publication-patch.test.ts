import { describe, it, expect } from 'vitest';
import { cmsPageInputSchema, cmsPostInputSchema } from '@events-manager/contracts';
import { publicationPatch } from '../src/application/cms/publication-patch.js';
describe('partial publication metadata on CMS updates', () => {
	it.each([
		{ schema: cmsPageInputSchema, input: { title: 'Página', permalink: '/page' } },
		{ schema: cmsPostInputSchema, input: { title: 'Post', slug: 'post' } },
	])('does not unpublish or reschedule when a content editor omits publication fields', ({ schema, input }) => {
		const result = publicationPatch(schema.parse(input), input);
		expect(result).not.toHaveProperty('status');
		expect(result).not.toHaveProperty('published_at');
		expect(result.title).toBe(input.title);
	});
	it('keeps explicit changes after publication authorization', () => {
		const input = { title: 'Page', permalink: '/page', status: 'published', published_at: '2026-12-01T00:00:00.000Z' };
		expect(publicationPatch(cmsPageInputSchema.parse(input), input)).toMatchObject(input);
	});
});
