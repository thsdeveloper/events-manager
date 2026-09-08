import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PreviewBanner from './PreviewBanner';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: React.ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

describe('PreviewBanner', () => {
	it('warns that the page is an unpublished draft and offers a way out of the preview', () => {
		const markup = renderToStaticMarkup(<PreviewBanner exitHref="/sobre" />);

		expect(markup).toContain('Pré-visualização de rascunho');
		expect(markup).toContain('esta página não está publicada');
		expect(markup).toMatch(/<a[^>]*href="\/sobre"[^>]*>Sair da pré-visualização<\/a>/);
		expect(markup).toMatch(/role="status"/);
	});
});
