import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import Text from './Text';

describe('Text (rich HTML from the CMS)', () => {
	it('renders editorial markup such as links and lists instead of flattening it to plain text', () => {
		const markup = renderToStaticMarkup(
			<Text
				content={'<p>Leia o <a href="https://exemplo.com/guia" target="_blank">guia</a></p><ul><li>Um</li></ul>'}
			/>,
		);

		expect(markup).toContain('<a href="https://exemplo.com/guia" target="_blank" rel="noopener noreferrer">guia</a>');
		expect(markup).toContain('<ul><li>Um</li></ul>');
	});

	it('never lets executable markup reach the page even if the API layer missed it', () => {
		const markup = renderToStaticMarkup(
			<Text content={'<p>ok</p><script>alert(1)</script><a href="javascript:alert(2)">x</a>'} />,
		);

		expect(markup).not.toContain('<script');
		expect(markup).not.toContain('alert(');
		expect(markup).not.toContain('javascript:');
		expect(markup).toContain('<p>ok</p>');
	});

	it('uses the typography styles so the rich content is readable in both themes', () => {
		const markup = renderToStaticMarkup(<Text content="<p>texto</p>" />);

		expect(markup).toMatch(/class="[^"]*\bprose\b[^"]*dark:prose-invert[^"]*"/);
	});
});
