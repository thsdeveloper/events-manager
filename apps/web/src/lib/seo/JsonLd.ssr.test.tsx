import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import JsonLd from './JsonLd';

describe('JsonLd', () => {
	it('emits one ld+json script per object with "<" escaped', () => {
		const markup = renderToStaticMarkup(
			<JsonLd
				data={[
					{ '@type': 'WebSite', name: 'Site </script>' },
					{ '@type': 'Organization', name: 'Org' },
				]}
			/>,
		);

		expect(markup.match(/<script type="application\/ld\+json">/g)).toHaveLength(2);
		expect(markup).toContain('"name":"Site \\u003c/script>"');
		expect(markup).toContain('"@type":"Organization"');
	});
});
