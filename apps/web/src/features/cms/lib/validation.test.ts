import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { cmsRedirectInputSchema } from '@events-manager/contracts';
import { fieldErrorsFromZod, firstError, validateWith } from './validation';

describe('validateWith', () => {
	it('returns the parsed data when the schema accepts the input', () => {
		const result = validateWith(cmsRedirectInputSchema, { url_from: '/a', url_to: '/b', response_code: '301' });

		expect(result).toEqual({ data: { url_from: '/a', url_to: '/b', response_code: '301' }, errors: null });
	});

	it('flattens nested paths into dotted keys so forms can show messages per field', () => {
		const schema = z.object({ buttons: z.array(z.object({ label: z.string().min(1, 'Informe o texto.') })) });
		const result = validateWith(schema, { buttons: [{ label: 'ok' }, { label: '' }] });

		expect(result.data).toBeNull();
		expect(result.errors).toEqual({ 'buttons.1.label': ['Informe o texto.'] });
	});

	it('exposes the first message of a field and of a prefix', () => {
		const errors = fieldErrorsFromZod(
			z.object({ url_to: z.string().min(2, 'Curto demais.') }).safeParse({ url_to: 'x' }),
		);

		expect(firstError(errors, 'url_to')).toBe('Curto demais.');
		expect(firstError(errors, 'missing')).toBeUndefined();
	});
});
