import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Badge } from './badge';

describe('Badge', () => {
	it('keeps a status inside its surrounding sentence when the browser parses server HTML', () => {
		const html = renderToStaticMarkup(
			<p>
				Status: <Badge>Publicado</Badge>
			</p>,
		);
		const document = new DOMParser().parseFromString(html, 'text/html');
		expect(document.querySelector('p')?.textContent).toBe('Status: Publicado');
	});
});
