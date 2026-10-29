/**
 * A página de edição carrega o evento no servidor e entrega ao mesmo
 * assistente em etapas da criação, em modo de edição.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import EditarEventoPage from './page';

const fetchEvent = vi.fn();
vi.mock('@/lib/backend-auth', () => ({
	authenticatedBackendFetch: (path: string) => fetchEvent(path),
	BackendRequestError: class BackendRequestError extends Error {
		status = 404;
	},
}));
vi.mock('next/navigation', () => ({
	notFound: () => {
		throw new Error('not found');
	},
}));
vi.mock('../../novo/_components/EventCreationWizard', () => ({
	EventCreationWizard: ({ mode, event }: { mode: string; event: { title: string } }) => (
		<div data-mode={mode}>{event.title}</div>
	),
}));

describe('EditarEventoPage', () => {
	it('hands the stored event to the creation wizard in edit mode', async () => {
		fetchEvent.mockResolvedValue({ id: 'e-1', title: 'Congresso' });

		const markup = renderToStaticMarkup(await EditarEventoPage({ params: Promise.resolve({ evento_id: 'e-1' }) }));

		expect(fetchEvent).toHaveBeenCalledWith('/api/events/e-1');
		expect(markup).toContain('data-mode="edit"');
		expect(markup).toContain('Congresso');
	});
});
