import { screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import LoginPage from './page';

vi.mock('next/navigation', () => ({
	useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
	useSearchParams: () => new URLSearchParams(),
}));
vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

describe('LoginPage', () => {
	it('draws the "Ou" divider as a word between two lines, without a masking background', () => {
		renderWithProviders(<LoginPage />);

		const word = screen.getByText('Ou');

		// A background on the word only exists to hide a line drawn behind it and
		// shows up as a box on any surface that is not exactly that colour.
		expect(word.className).not.toMatch(/(^|\s|:)bg-/);
		expect(word.previousElementSibling).toHaveAttribute('aria-hidden', 'true');
		expect(word.nextElementSibling).toHaveAttribute('aria-hidden', 'true');
	});

	it('links visitors without an account to the registration page', () => {
		renderWithProviders(<LoginPage />);

		expect(screen.getByRole('link', { name: /criar conta gratuita/i })).toHaveAttribute('href', '/register');
	});

	it('decorates the brand panel with the mood-board illustration, hidden from assistive technology', () => {
		const { container } = renderWithProviders(<LoginPage />);

		const illustration = container.querySelector('img[src*="mood-board"]');
		expect(illustration).not.toBeNull();
		expect(illustration).toHaveAttribute('alt', '');
		expect(illustration).toHaveAttribute('aria-hidden', 'true');
	});
});
