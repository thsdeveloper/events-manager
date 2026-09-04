import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test';
import { CpfInput, PhoneInput } from './masked-inputs';

describe('masked inputs', () => {
	it('shows the phone placeholder while nothing has been typed', () => {
		renderWithProviders(<PhoneInput aria-label="Telefone" value="" onChange={vi.fn()} />);

		const field = screen.getByLabelText('Telefone');
		expect(field).toHaveValue('');
		expect(field).toHaveAttribute('placeholder', '(11) 91234-5678');
	});

	it('shows the CPF placeholder while nothing has been typed', () => {
		renderWithProviders(<CpfInput aria-label="CPF" value="" onChange={vi.fn()} />);

		const field = screen.getByLabelText('CPF');
		expect(field).toHaveValue('');
		expect(field).toHaveAttribute('placeholder', '000.000.000-00');
	});
});
