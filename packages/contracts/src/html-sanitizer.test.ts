import { describe, expect, it } from 'vitest';
import { sanitizeHtml } from './html-sanitizer.js';

describe('sanitizeHtml', () => {
	it('keeps the editorial tags a rich text block needs', () => {
		const html =
			'<h2>Título</h2><p>Um <strong>texto</strong> com <em>ênfase</em>, <a href="/eventos">link</a> e lista:</p><ul><li>um</li><li>dois</li></ul><blockquote>citação</blockquote>';

		expect(sanitizeHtml(html)).toBe(html);
	});

	it('removes scripts, styles and iframes together with their content', () => {
		const html = '<p>antes</p><script>alert(1)</script><style>p{display:none}</style><iframe src="x"></iframe><p>depois</p>';

		expect(sanitizeHtml(html)).toBe('<p>antes</p><p>depois</p>');
	});

	it('drops event handler attributes and javascript: URLs', () => {
		expect(sanitizeHtml('<p onclick="steal()">oi</p>')).toBe('<p>oi</p>');
		expect(sanitizeHtml('<a href="javascript:alert(1)">x</a>')).toBe('<a>x</a>');
		expect(sanitizeHtml('<a href=" JaVaScRiPt:alert(1)">x</a>')).toBe('<a>x</a>');
		expect(sanitizeHtml('<img src="data:text/html;base64,AAAA" alt="a">')).toBe('');
	});

	it('unwraps unknown tags but keeps their text', () => {
		expect(sanitizeHtml('<div><span class="x">texto</span></div>')).toBe('texto');
		expect(sanitizeHtml('<form action="/x"><input name="a"><button>enviar</button></form>')).toBe('enviar');
	});

	it('forces safe rel on links that open a new tab and keeps only http(s), mailto and relative URLs', () => {
		expect(sanitizeHtml('<a href="https://ex.com" target="_blank">x</a>')).toBe(
			'<a href="https://ex.com" target="_blank" rel="noopener noreferrer">x</a>',
		);
		expect(sanitizeHtml('<a href="mailto:oi@ex.com">x</a>')).toBe('<a href="mailto:oi@ex.com">x</a>');
		expect(sanitizeHtml('<a href="ftp://ex.com">x</a>')).toBe('<a>x</a>');
	});

	it('escapes attribute values and stray angle brackets so markup cannot break out', () => {
		expect(sanitizeHtml('<a href="/a?x=1&y=2" title=\'q"uote\'>x</a>')).toBe(
			'<a href="/a?x=1&amp;y=2" title="q&quot;uote">x</a>',
		);
		expect(sanitizeHtml('1 < 2 e 3 > 2')).toBe('1 &lt; 2 e 3 &gt; 2');
		expect(sanitizeHtml('<!-- comentário --><p>ok</p>')).toBe('<p>ok</p>');
	});

	it('keeps images only with http(s) or relative sources and forces lazy loading', () => {
		expect(sanitizeHtml('<img src="https://cdn.ex.com/a.png" alt="foto" width="10">')).toBe(
			'<img src="https://cdn.ex.com/a.png" alt="foto" width="10" loading="lazy">',
		);
	});

	it('returns an empty string for empty or nullish input', () => {
		expect(sanitizeHtml('')).toBe('');
		expect(sanitizeHtml(null)).toBe('');
		expect(sanitizeHtml(undefined)).toBe('');
	});
});
