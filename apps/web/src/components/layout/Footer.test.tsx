import type { Globals, Navigation } from '@events-manager/contracts';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import Footer from './Footer';

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

vi.mock('@/components/ui/ThemeToggle', () => ({ default: () => <button type="button">Tema</button> }));

describe('Footer', () => {
	it('renders only configured public data and safe navigation URLs', () => {
		const globals: Globals = {
			description: 'Eventos feitos para pessoas reais.',
			id: '00000000-0000-4000-8000-000000000001',
			social_links: [
				{ service: 'instagram', url: 'https://instagram.com/events' },
				{ service: 'github', url: 'javascript:alert(1)' },
			],
			title: 'Events Manager',
		};
		const navigation: Navigation = {
			id: 'footer',
			items: [
				{ id: 'safe', title: 'Agenda', type: 'url', url: '/agenda' },
				{ id: 'unsafe', title: 'Inseguro', type: 'url', url: 'javascript:alert(1)' },
			],
		};

		const markup = renderToStaticMarkup(<Footer globals={globals} navigation={navigation} />);

		expect(markup).toContain('Eventos feitos para pessoas reais.');
		expect(markup).toContain('href="/agenda"');
		expect(markup).toContain('https://instagram.com/events');
		expect(markup).not.toContain('javascript:');
		expect(markup).not.toContain('contato@exemplo.com');
		expect(markup).not.toContain('+1200 eventos');
		expect(markup).not.toContain('Newsletter');
	});
});
