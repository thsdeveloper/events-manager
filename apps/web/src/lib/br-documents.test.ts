import { describe, expect, it } from 'vitest';
import { maskCPF, maskPhone } from './br-documents';

describe('maskPhone', () => {
	it('leaves an empty value empty so the field can show its placeholder', () => {
		expect(maskPhone('')).toBe('');
	});

	it('masks progressively as digits are typed', () => {
		expect(maskPhone('1')).toBe('(1');
		expect(maskPhone('11')).toBe('(11');
		expect(maskPhone('119')).toBe('(11) 9');
		expect(maskPhone('1191234')).toBe('(11) 9123-4');
		expect(maskPhone('1134567890')).toBe('(11) 3456-7890');
		expect(maskPhone('11912345678')).toBe('(11) 91234-5678');
	});
});

describe('maskCPF', () => {
	it('leaves an empty value empty and masks a full number', () => {
		expect(maskCPF('')).toBe('');
		expect(maskCPF('52998224725')).toBe('529.982.247-25');
	});
});
