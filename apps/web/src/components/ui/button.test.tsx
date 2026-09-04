import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from './button';

describe('Button', () => {
	it('lays its children out directly in its own flex row so justify-between reaches a trailing icon', () => {
		render(
			<Button className="w-full justify-between">
				<span>Rótulo</span>
				<svg data-testid="trailing-icon" />
			</Button>,
		);

		const button = screen.getByRole('button');
		const wrapper = screen.getByTestId('trailing-icon').parentElement;

		// Either no wrapper at all, or one that does not create its own box.
		expect(wrapper === button || wrapper?.classList.contains('contents')).toBe(true);
	});

	it('still hides the label while a request is pending', () => {
		render(<Button loading>Salvar</Button>);

		expect(screen.getByText('Salvar')).toHaveClass('invisible');
		expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
	});
});
