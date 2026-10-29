import { describe, expect, it } from 'vitest';
import { organizerSignupSchema } from './schemas.js';

const company = {
	account_type: 'company' as const,
	name: 'Festivais Ltda',
	email: 'contato@festivais.com',
	phone: '(11) 91234-5678',
	document: '45.723.174/0001-10',
	accept_terms: true,
};

function issuePaths(result: { success: boolean; error?: { issues: Array<{ path: PropertyKey[] }> } }) {
	return result.error?.issues.map((issue) => issue.path.join('.')) ?? [];
}

describe('organizerSignupSchema', () => {
	it('accepts an individual with only what the person can choose: name, e-mail, phone and CPF come from the verified profile', () => {
		const result = organizerSignupSchema.safeParse({
			account_type: 'individual',
			name: 'Outro Nome',
			email: 'outro@example.com',
			phone: '11 98888-7777',
			document: '529.982.247-25',
			accept_terms: true,
		});

		expect(result.success).toBe(true);
		if (result.success) {
			expect(result.data).toEqual({ account_type: 'individual', description: null, website: null, accept_terms: true });
		}
	});

	it('still demands the terms and the optional texts from an individual', () => {
		expect(issuePaths(organizerSignupSchema.safeParse({ account_type: 'individual', accept_terms: false }))).toContain(
			'accept_terms',
		);
		expect(
			issuePaths(
				organizerSignupSchema.safeParse({ account_type: 'individual', accept_terms: true, website: 'festivais' }),
			),
		).toContain('website');
	});

	it('requires a valid CNPJ for a company and normalises it to digits', () => {
		const result = organizerSignupSchema.safeParse(company);

		expect(result.success).toBe(true);
		if (result.success) expect(result.data).toMatchObject({ document: '45723174000110' });

		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, document: '529.982.247-25' }))).toContain(
			'document',
		);
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, document: '' }))).toContain('document');
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, document: undefined }))).toContain('document');
	});

	it('demands brand name, contact e-mail, a phone with DDD and the terms from a company', () => {
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, name: 'A' }))).toContain('name');
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, email: 'contato' }))).toContain('email');
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, phone: '1234' }))).toContain('phone');
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, phone: '' }))).toContain('phone');
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, accept_terms: false }))).toContain('accept_terms');
	});

	it('keeps the optional description and website bounded and normalised', () => {
		expect(organizerSignupSchema.parse({ ...company, website: '', description: '  ' })).toMatchObject({
			website: null,
			description: null,
		});
		expect(
			organizerSignupSchema.parse({ ...company, website: 'https://festivais.com', description: 'Shows' }),
		).toMatchObject({
			website: 'https://festivais.com',
			description: 'Shows',
		});
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, website: 'festivais' }))).toContain('website');
		expect(issuePaths(organizerSignupSchema.safeParse({ ...company, description: 'x'.repeat(601) }))).toContain(
			'description',
		);
	});

	it('rejects unknown account types', () => {
		expect(organizerSignupSchema.safeParse({ ...company, account_type: 'ngo' }).success).toBe(false);
	});
});
