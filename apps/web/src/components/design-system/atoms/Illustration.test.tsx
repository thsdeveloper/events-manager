import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { Illustration } from './Illustration';

const art = { src: '/images/empty/events.svg', width: 334, height: 376 };

describe('Illustration', () => {
	it('is decorative: invisible to assistive technology, with its intrinsic size declared', () => {
		const { container } = renderWithProviders(<Illustration illustration={art} />);

		const img = container.querySelector('img');
		expect(img).toHaveAttribute('src', '/images/empty/events.svg');
		expect(img).toHaveAttribute('alt', '');
		expect(img).toHaveAttribute('aria-hidden', 'true');
		expect(img).toHaveAttribute('width', '334');
		expect(img).toHaveAttribute('height', '376');
		expect(screen.queryByRole('img')).not.toBeInTheDocument();
	});
});
