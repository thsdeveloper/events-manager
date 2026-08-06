import { describe, expect, it } from 'vitest';
import { safeInternalRedirect } from './navigation';

describe('safeInternalRedirect', () => {
	it.each(['https://example.com', '//example.com', 'javascript:alert(1)', undefined, null])(
		'rejects non-local redirect %s',
		(value) => {
			expect(safeInternalRedirect(value, '/perfil')).toBe('/perfil');
		},
	);

	it('keeps a local application path', () => {
		expect(safeInternalRedirect('/admin/eventos?status=draft', '/perfil')).toBe('/admin/eventos?status=draft');
	});
});
