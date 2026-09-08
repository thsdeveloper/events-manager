import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Text, { htmlToPlainText } from './Text';

describe('safe text', () => {
	it('preserves readable paragraphs while removing executable markup', () => {
		expect(
			htmlToPlainText('<p>Primeiro &amp; seguro</p><script>alert(1)</script><p><strong>Segundo</strong><br>fim</p>'),
		).toBe('Primeiro & seguro\nSegundo\nfim');
	});

	it('keeps the editorial content but strips event handlers and unsafe image sources', () => {
		const output = renderToStaticMarkup(
			<Text content={'<img src=x onerror="alert(1)">Texto<img src="javascript:alert(2)" alt="x">'} />,
		);

		expect(output).not.toContain('onerror');
		expect(output).not.toContain('javascript:');
		expect(output).toContain('Texto');
		expect(output.match(/<img/g)).toHaveLength(1);
	});
});
