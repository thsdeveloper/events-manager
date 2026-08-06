import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Text, { htmlToPlainText } from './Text';

describe('safe text', () => {
	it('preserves readable paragraphs while removing executable markup', () => {
		expect(
			htmlToPlainText('<p>Primeiro &amp; seguro</p><script>alert(1)</script><p><strong>Segundo</strong><br>fim</p>'),
		).toBe('Primeiro & seguro\nSegundo\nfim');
	});

	it('renders user-authored content as text instead of raw HTML', () => {
		const output = renderToStaticMarkup(<Text content={'<img src=x onerror="alert(1)">Texto'} />);

		expect(output).not.toContain('<img');
		expect(output).not.toContain('onerror');
		expect(output).toContain('Texto');
	});
});
