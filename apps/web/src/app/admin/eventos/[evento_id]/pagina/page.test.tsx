/**
 * A página do construtor carrega o evento e o rascunho da landing no servidor
 * e entrega os dois ao construtor.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import PaginaDoEventoPage from './page';

const backend = vi.fn();
vi.mock('@/lib/backend-auth', () => ({
	authenticatedBackendFetch: (path: string) => backend(path),
	BackendRequestError: class BackendRequestError extends Error {
		status = 404;
	},
}));
vi.mock('next/navigation', () => ({
	notFound: () => {
		throw new Error('not found');
	},
}));
vi.mock('@/features/event-page/builder/EventPageBuilder', () => ({
	EventPageBuilder: ({ event, initialPage }: { event: { title: string }; initialPage: { enabled: boolean } }) => (
		<div data-enabled={String(initialPage.enabled)}>{event.title}</div>
	),
}));

describe('PaginaDoEventoPage', () => {
	it('hands the event and its page draft to the builder', async () => {
		backend.mockImplementation(async (path: string) =>
			path.endsWith('/page')
				? { event_id: 'e-1', enabled: true, draft: {}, published: {} }
				: { id: 'e-1', title: 'Congresso' },
		);

		const markup = renderToStaticMarkup(await PaginaDoEventoPage({ params: Promise.resolve({ evento_id: 'e-1' }) }));

		expect(backend).toHaveBeenCalledWith('/api/events/e-1');
		expect(backend).toHaveBeenCalledWith('/api/events/e-1/page');
		expect(markup).toContain('data-enabled="true"');
		expect(markup).toContain('Congresso');
	});
});
