import { describe, expect, it } from 'vitest';
import { httpUrlSchema } from '@events-manager/contracts';
import { isUuid, sanitizePostgrestOrTerm } from '../src/infrastructure/supabase/search.js';

describe('Supabase query value guards', () => {
	it('removes PostgREST filter control characters from OR search values', () => {
		expect(sanitizePostgrestOrTerm(' Ana%),status.eq.active,(Silva_ ')).toBe('Ana status.eq.active Silva');
	});

	it('accepts only UUIDs before using provider external IDs as row keys', () => {
		expect(isUuid('00000000-0000-4000-8000-000000000001')).toBe(true);
		expect(isUuid('id.eq.anything')).toBe(false);
	});

	it('rejects executable URL schemes at the shared HTTP boundary', () => {
		expect(httpUrlSchema.safeParse('https://events.example.com/live').success).toBe(true);
		expect(httpUrlSchema.safeParse('javascript:alert(1)').success).toBe(false);
	});
});
