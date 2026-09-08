import { describe, expect, it } from 'vitest';
import { createPreviewToken, verifyPreviewToken } from '../src/application/cms/preview-token.js';

const secret = 'test-cookie-secret-value';
const issuedAt = new Date('2026-09-05T12:00:00.000Z');

describe('preview tokens', () => {
	it('lets an editor open a draft page for a limited time', () => {
		const { token, expiresAt } = createPreviewToken(secret, '/sobre', issuedAt);

		expect(expiresAt).toBe('2026-09-05T13:00:00.000Z');
		expect(verifyPreviewToken(secret, token, '/sobre', new Date('2026-09-05T12:30:00.000Z'))).toBe(true);
	});

	it('rejects an expired token, another page and a tampered signature', () => {
		const { token } = createPreviewToken(secret, '/sobre', issuedAt);

		expect(verifyPreviewToken(secret, token, '/sobre', new Date('2026-09-05T13:00:01.000Z'))).toBe(false);
		expect(verifyPreviewToken(secret, token, '/contato', new Date('2026-09-05T12:30:00.000Z'))).toBe(false);
		expect(verifyPreviewToken(secret, `${token.slice(0, -2)}xx`, '/sobre', new Date('2026-09-05T12:30:00.000Z'))).toBe(false);
		expect(verifyPreviewToken('other-secret', token, '/sobre', new Date('2026-09-05T12:30:00.000Z'))).toBe(false);
		expect(verifyPreviewToken(secret, 'garbage', '/sobre', issuedAt)).toBe(false);
	});
});
