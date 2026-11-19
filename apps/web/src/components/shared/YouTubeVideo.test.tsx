import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it } from 'vitest';
import { YouTubeVideo } from './YouTubeVideo';

it('can be started with the keyboard, stops the old video when its URL changes, and hides a removed video', async () => {
	const user = userEvent.setup();
	const view = render(<YouTubeVideo url="https://youtu.be/M7lc1UVf-VE" title="Encontro" />);
	await user.tab();
	expect(screen.getByRole('button', { name: 'Assistir ao vídeo' })).toHaveFocus();
	await user.keyboard('{Enter}');
	expect(screen.getByTitle('Vídeo sobre Encontro')).toHaveAttribute('allowfullscreen');
	view.rerender(<YouTubeVideo url="https://www.youtube.com/watch?v=dQw4w9WgXcQ" title="Encontro" />);
	expect(screen.queryByTitle('Vídeo sobre Encontro')).not.toBeInTheDocument();
	expect(screen.getByRole('button', { name: 'Assistir ao vídeo' })).toBeVisible();
	view.rerender(<YouTubeVideo url={null} title="Encontro" />);
	expect(screen.queryByRole('button')).not.toBeInTheDocument();
	expect(screen.queryByRole('link')).not.toBeInTheDocument();
});
