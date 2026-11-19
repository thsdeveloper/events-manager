import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { EventShareActions } from './EventShareActions';

describe('event sharing', () => {
	it('offers named social links with the canonical event URL, without checkout or tracking parameters', () => {
		render(<EventShareActions title="Encontro & conexões" slug="encontro" />);
		const url = `${window.location.origin}/eventos/encontro`;
		expect(screen.getByRole('link', { name: 'Compartilhar no WhatsApp' })).toHaveAttribute(
			'href',
			`https://wa.me/?text=${encodeURIComponent(`Encontro & conexões ${url}`)}`,
		);
		expect(screen.getByRole('link', { name: 'Compartilhar no Facebook' }).getAttribute('href')).toContain(
			encodeURIComponent(url),
		);
		expect(screen.getByRole('link', { name: 'Compartilhar no LinkedIn' })).toHaveAttribute(
			'rel',
			'noopener noreferrer',
		);
		expect(screen.getByRole('link', { name: 'Compartilhar no X' })).toBeVisible();
	});
	it('copies the link and gives accessible feedback', async () => {
		const user = userEvent.setup();
		const copy = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue();
		render(<EventShareActions title="Encontro" slug="encontro" />);
		await user.click(screen.getByRole('button', { name: 'Copiar link do evento' }));
		expect(copy).toHaveBeenCalledWith(`${window.location.origin}/eventos/encontro`);
		expect(screen.getByRole('status')).toHaveTextContent('Link copiado!');
	});
	it('shows a selectable URL when clipboard permission is denied', async () => {
		const user = userEvent.setup();
		vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'));
		render(<EventShareActions title="Encontro" slug="encontro" />);
		await user.click(screen.getByRole('button', { name: 'Copiar link do evento' }));
		expect(screen.getByRole('textbox', { name: 'Link do evento' })).toHaveValue(
			`${window.location.origin}/eventos/encontro`,
		);
	});
	it('uses the device share sheet when available and silently handles dismissal', async () => {
		const share = vi.fn().mockRejectedValue(new DOMException('Cancelled', 'AbortError'));
		vi.stubGlobal('navigator', Object.assign(Object.create(navigator), { share }));
		const user = userEvent.setup();
		render(<EventShareActions title="Encontro" slug="encontro" />);
		await user.click(screen.getByRole('button', { name: 'Mais opções de compartilhamento' }));
		expect(share).toHaveBeenCalledWith({ title: 'Encontro', url: `${window.location.origin}/eventos/encontro` });
		expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
		vi.unstubAllGlobals();
	});
});
