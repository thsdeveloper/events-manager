import { describe, expect, it } from 'vitest';
import { hasValidFileSignature } from '../src/application/media/media-service.js';

describe('upload file signatures', () => {
	it.each([
		['image/jpeg', Buffer.from([0xff, 0xd8, 0xff, 0x00])],
		['image/png', Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
		['image/gif', Buffer.from('GIF89a')],
		['image/webp', Buffer.from('RIFFxxxxWEBP')],
		['application/pdf', Buffer.from('%PDF-1.7')],
	])('accepts a valid %s header', (mimetype, buffer) => {
		expect(hasValidFileSignature(mimetype, buffer)).toBe(true);
	});

	it('rejects active SVG and files whose declared MIME does not match their bytes', () => {
		expect(hasValidFileSignature('image/svg+xml', Buffer.from('<svg><script /></svg>'))).toBe(false);
		expect(hasValidFileSignature('image/png', Buffer.from('<script>alert(1)</script>'))).toBe(false);
	});
});
