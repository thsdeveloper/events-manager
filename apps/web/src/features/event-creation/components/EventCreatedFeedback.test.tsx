import { StrictMode } from 'react';
import { screen, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { useToast } from '@/hooks/use-toast';
import { rememberEventCreation, consumeEventCreation } from '../lib/creation-feedback';
import { EventCreatedFeedback } from './EventCreatedFeedback';
function Messages() {
	const { toasts } = useToast();

	return <output aria-label="Notificações">{toasts.map((toast) => toast.title).join('|')}</output>;
}
afterEach(() => {
	sessionStorage.clear();
	vi.useRealTimers();
});
describe('feedback after arriving at the created event', () => {
	it('waits for the destination, consumes once, and ends the celebration', () => {
		vi.useFakeTimers();
		rememberEventCreation('new-event', 'published');
		const { rerender } = renderWithProviders(
			<>
				<EventCreatedFeedback eventId="another-event" />
				<Messages />
			</>,
		);
		expect(screen.getByLabelText('Notificações')).not.toHaveTextContent('Evento criado!');
		rerender(
			<StrictMode>
				<EventCreatedFeedback eventId="new-event" />
				<Messages />
			</StrictMode>,
		);
		act(() => vi.advanceTimersByTime(0));
		expect(screen.getByLabelText('Notificações')).toHaveTextContent('Evento criado!');
		expect(consumeEventCreation('new-event')).toBeNull();
		expect(document.querySelector('[data-event-celebration]')).toBeInTheDocument();
		act(() => vi.advanceTimersByTime(8000));
		expect(document.querySelector('[data-event-celebration]')).not.toBeInTheDocument();
	});
	it('does not replay a stale notification on a later visit', () => {
		vi.useFakeTimers();
		rememberEventCreation('expired', 'draft');
		vi.advanceTimersByTime(6 * 60 * 1000);
		expect(consumeEventCreation('expired')).toBeNull();
	});
	it('does not celebrate a recovered cancelled event', () => {
		vi.useFakeTimers();
		rememberEventCreation('cancelled-event', 'cancelled');
		renderWithProviders(
			<>
				<EventCreatedFeedback eventId="cancelled-event" />
				<Messages />
			</>,
		);
		act(() => vi.advanceTimersByTime(0));
		expect(screen.getByLabelText('Notificações')).toHaveTextContent('Evento existente recuperado');
		expect(document.querySelector('[data-event-celebration]')).not.toBeInTheDocument();
	});
});
