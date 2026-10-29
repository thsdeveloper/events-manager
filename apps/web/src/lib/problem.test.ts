/**
 * Um problema RFC 7807 de validação traz o campo recusado em `context.errors`.
 * A pessoa precisa ler "CPF inválido", não "Os dados enviados são inválidos".
 */
import { describe, expect, it } from 'vitest';
import { describeProblem } from './problem';

describe('describeProblem', () => {
	it('prefers the first field error over the generic detail', () => {
		expect(
			describeProblem({
				detail: 'Os dados enviados são inválidos.',
				context: { errors: { fieldErrors: { participantInfo: ['CPF inválido'] }, formErrors: [] } },
			}),
		).toBe('CPF inválido');
	});

	it('falls back to the detail, then to the caller message', () => {
		expect(describeProblem({ detail: 'Cupom não encontrado para este evento.' }, 'Erro')).toBe(
			'Cupom não encontrado para este evento.',
		);
		expect(describeProblem({}, 'Erro ao criar sessão de checkout')).toBe('Erro ao criar sessão de checkout');
		expect(describeProblem(null, 'Erro')).toBe('Erro');
	});
});
