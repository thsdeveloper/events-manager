import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { buildDefaultEventPageLayout } from '@events-manager/contracts';
import { publicEventFixture as event } from '@/test/event-page-fixtures';
import { EventPageRenderer } from './EventPageRenderer';
vi.mock('next/image', () => ({ default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} /> }));
it('server-renders an existing layout with real checkout links, rich HTML and hidden sections omitted', () => {
	const layout = buildDefaultEventPageLayout({ ...event, cover_image: null });
	layout.sections.push({ id: 'hidden', type: 'richtext', anchor: 'hidden', hidden: true, content: 'Texto privado' });
	const html = renderToStaticMarkup(<EventPageRenderer event={event} layout={layout} />);
	expect(html).toContain(event.title);
	expect(html).toContain('Dois dias');
	expect(html).toContain(`/eventos/${event.slug}/checkout`);
	expect(html).not.toContain('Texto privado');
	expect(html).not.toContain('data-puck');
});
