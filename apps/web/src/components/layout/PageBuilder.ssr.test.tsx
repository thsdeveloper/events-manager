import type { PageBlock } from '@events-manager/contracts';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PageBuilder from './PageBuilder';

vi.mock('next/link', () => ({
	default: ({ children, href, ...props }: { children: ReactNode; href: string }) => (
		<a href={href} {...props}>
			{children}
		</a>
	),
}));

vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

const hero: PageBlock = {
	id: 'block-hero',
	collection: 'block_hero',
	background: 'light',
	item: {
		id: 'hero-item',
		tagline: 'Sua próxima experiência',
		headline: 'Eventos que viram boas histórias',
		description: 'Encontre eventos perto de você.',
		layout: 'image_right',
		image: null,
		button_group: {
			id: 'group',
			buttons: [{ id: 'btn', label: 'Explorar eventos', type: 'url', url: '/eventos', variant: 'default' }],
		},
	} as any,
};

const richText: PageBlock = {
	id: 'block-text',
	collection: 'block_richtext',
	background: 'dark',
	item: {
		id: 'text-item',
		tagline: 'Como funciona',
		headline: 'Do cadastro ao check-in',
		content: '<p>Organizadores publicam eventos.</p><ul><li>Check-in por QR Code.</li></ul>',
		alignment: 'center',
	} as any,
};

const unknown: PageBlock = {
	id: 'block-unknown',
	collection: 'block_carousel',
	item: { id: 'x', headline: 'Bloco desconhecido' } as any,
};

describe('PageBuilder (server render)', () => {
	it('renders a hero with the page h1 and a rich text section with its content as HTML', () => {
		const markup = renderToStaticMarkup(<PageBuilder sections={[hero, richText]} />);

		expect(markup).toMatch(/<h1[^>]*>.*Eventos que viram boas histórias.*<\/h1>/);
		expect(markup).toContain('<a href="/eventos"');
		expect(markup).toContain('<ul><li>Check-in por QR Code.</li></ul>');
		expect(markup).not.toContain('&lt;ul&gt;');
	});

	it('uses h2 for section headlines so the hero keeps the only h1 of the page', () => {
		const markup = renderToStaticMarkup(<PageBuilder sections={[hero, richText]} />);

		expect(markup.match(/<h1\b/g)).toHaveLength(1);
		expect(markup).toMatch(/<h2[^>]*>Do cadastro ao check-in<\/h2>/);
	});

	it('ignores blocks whose collection has no renderer instead of failing the page', () => {
		const markup = renderToStaticMarkup(<PageBuilder sections={[unknown, richText]} />);

		expect(markup).not.toContain('Bloco desconhecido');
		expect(markup).toContain('Do cadastro ao check-in');
	});

	it('paints dark sections with a dark background and light text, keeping the data attribute', () => {
		const markup = renderToStaticMarkup(<PageBuilder sections={[hero, richText]} />);

		expect(markup).toMatch(/data-background="dark"[^>]*class="[^"]*bg-slate-950[^"]*text-white/);
		expect(markup).toMatch(
			/class="[^"]*"[^>]*data-background="light"|data-background="light"[^>]*class="(?![^"]*bg-slate-950)/,
		);
	});
});

/**
 * Blocos sem estado nem eventos são server components: a home não deve enviar
 * o JavaScript deles ao navegador. Só os blocos interativos ficam `use client`.
 */
describe('static blocks stay on the server', () => {
	it.each([
		'src/components/layout/PageBuilder.tsx',
		'src/components/blocks/BaseBlock.tsx',
		'src/components/blocks/Hero.tsx',
		'src/components/blocks/RichText.tsx',
		'src/components/blocks/Pricing.tsx',
		'src/components/blocks/PricingCard.tsx',
		'src/components/blocks/Button.tsx',
		'src/components/blocks/ButtonGroup.tsx',
	])('%s is not a client component', (file) => {
		const source = readFileSync(join(process.cwd(), file), 'utf8');

		expect(source).not.toMatch(/^\s*['"]use client['"]/m);
	});

	it('the block Button never calls buttonVariants(), a client-only function that breaks the server render', () => {
		const source = readFileSync(join(process.cwd(), 'src/components/blocks/Button.tsx'), 'utf8');

		expect(source).not.toMatch(/buttonVariants\(/);
	});
});
