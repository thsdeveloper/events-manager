import { describe, expect, it } from 'vitest';
import { eventAIContextSchema } from './event-ai.js';

describe('event AI category context', () => {
	it.each(['50000000-0000-0000-0000-000000000012', '550e8400-e29b-41d4-a716-446655440000'])(
		'accepts catalog category identifiers without changing them: %s',
		(categoryId) => {
			expect(eventAIContextSchema.parse({ title: 'Encontro da comunidade', categoryId }).categoryId).toBe(categoryId);
		},
	);

	it.each(['comunidade', '', '50000000-0000-0000-0000-00000000000z'])(
		'rejects a malformed category identifier: %s',
		(categoryId) => {
			const result = eventAIContextSchema.safeParse({ title: 'Encontro da comunidade', categoryId });
			expect(result.success).toBe(false);
			expect(result.error?.issues[0]?.path).toEqual(['categoryId']);
		},
	);
});
