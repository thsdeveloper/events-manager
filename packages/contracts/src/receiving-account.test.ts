import { describe, expect, it } from 'vitest';
import { receivingAccountSubmissionSchema, receivingAccountReviewSchema } from './receiving-account.js';
const ids = ['10000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000002'];
const pix = {
	method: 'pix',
	holder_name: 'Ana Silva',
	holder_document: '529.982.247-25',
	pix_key_type: 'CPF',
	pix_key: '529.982.247-25',
};
const bank = {
	method: 'bank_transfer',
	holder_name: 'Ana Silva',
	holder_document: '52998224725',
	bank_code: '001',
	bank_name: 'Banco do Brasil',
	branch: '1234',
	branch_digit: '',
	account_number: '123456',
	account_digit: 'X',
	account_type: 'checking',
};
const submission = (account: unknown = pix) => ({
	account,
	document_ids: ids,
	expected_request_id: null,
	confirm_ownership: true,
});
describe('receiving account submissions', () => {
	it('normalizes CPF/CNPJ and preserves bank check digits', () => {
		expect(receivingAccountSubmissionSchema.parse(submission()).account).toMatchObject({
			holder_document: '52998224725',
			pix_key: '52998224725',
		});
		expect(receivingAccountSubmissionSchema.parse(submission(bank)).account).toMatchObject({
			account_number: '123456',
			account_digit: 'X',
		});
	});
	it.each([
		{ ...pix, pix_key: '11111111111' },
		{ ...pix, pix_key_type: 'CNPJ', pix_key: '11111111111111' },
		{ ...pix, pix_key_type: 'CNPJ', pix_key: '12345' },
		{ ...pix, pix_key_type: 'CNPJ', pix_key: '45723174000111' },
		{ ...pix, pix_key_type: 'EMAIL', pix_key: 'invalid' },
		{ ...pix, pix_key_type: 'PHONE', pix_key: '11999999999' },
		{ ...pix, pix_key_type: 'RANDOM', pix_key: 'bad' },
		{ ...pix, holder_document: '11111111111' },
		{ ...bank, bank_code: 'abc' },
		{ ...bank, account_type: 'invalid' },
		{ ...bank, account_digit: '' },
		{ ...bank, account_number: '123<script>' },
		{ ...pix, bank_code: '001' },
	])('rejects invalid or mixed destination data: %j', (account) =>
		expect(receivingAccountSubmissionSchema.safeParse(submission(account)).success).toBe(false),
	);
	it.each([
		{ document_ids: [] },
		{ document_ids: [ids[0], ids[0]] },
		{ document_ids: ['another'] },
		{ confirm_ownership: false },
		{ status: 'approved' },
		{ expected_request_id: 'bad' },
	])('rejects incomplete or privileged submissions: %j', (patch) => {
		expect(receivingAccountSubmissionSchema.safeParse({ ...submission(), ...patch }).success).toBe(false);
	});
	it.each([
		['EMAIL', 'ana@example.com'],
		['PHONE', '+5511999999999'],
		['RANDOM', ids[0]],
		['CNPJ', '45.723.174/0001-10'],
	])('accepts a validated %s key', (type, key) => {
		expect(
			receivingAccountSubmissionSchema.safeParse(submission({ ...pix, pix_key_type: type, pix_key: key })).success,
		).toBe(true);
	});
	it('requires a decision, document verification and a meaningful reason, never replacement account data', () => {
		const review = { decision: 'approved', reason: 'Documentos e titularidade conferidos', documents_checked: true };
		expect(receivingAccountReviewSchema.safeParse(review).success).toBe(true);
		expect(receivingAccountReviewSchema.safeParse({ ...review, decision: 'rejected' }).success).toBe(true);
		for (const patch of [{ reason: '' }, { documents_checked: false }, { decision: 'pending' }, { account: pix }])
			expect(receivingAccountReviewSchema.safeParse({ ...review, ...patch }).success).toBe(false);
	});
});
