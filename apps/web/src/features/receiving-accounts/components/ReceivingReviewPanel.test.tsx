import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders, mockFetch, jsonResponse, problemResponse } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import { ReceivingReviewPanel } from './ReceivingReviewPanel';
const data = {
	organizer: {
		id: 'org',
		name: 'Produtora',
		document: '52998224725',
		production_approved_at: null,
		payout_status: 'pending_review',
	},
	current: {
		id: 'request-1',
		version: 2,
		account: {
			method: 'pix',
			holder_name: 'Ana Silva',
			holder_document: '52998224725',
			pix_key_type: 'EMAIL',
			pix_key: 'ana@example.com',
		},
		status: 'pending',
		submitted_at: '2026-11-18T10:00:00Z',
		documents: [
			{
				id: 'doc-1',
				kind: 'representative_identity',
				filename: 'identity.pdf',
				size: 100,
				mime_type: 'application/pdf',
			},
		],
	},
	history: [],
	pagination: { page: 1, limit: 10, total: 0, pageCount: 0 },
};
describe('super-admin receiving review', () => {
	it('shows submitted details and private documents without any destination editor', async () => {
		mockFetch([[/receiving-account/, () => jsonResponse(data)]]);
		renderWithProviders(<ReceivingReviewPanel organizerId="org" />);
		expect(await screen.findByText('ana@example.com')).toBeInTheDocument();
		expect(screen.queryByLabelText('Chave PIX')).not.toBeInTheDocument();
		expect(screen.getByRole('link', { name: /identity.pdf/ })).toHaveAttribute(
			'href',
			'/api/super-admin/organizers/org/receiving-account/documents/doc-1',
		);
	});
	it('requires checking documents and a reason, and posts only the decision about the displayed version', async () => {
		const fetchMock = mockFetch([[/receiving-account/, () => jsonResponse(data)]]);
		const { user } = renderWithProviders(<ReceivingReviewPanel organizerId="org" />);
		await screen.findByText('ana@example.com');
		expect(screen.getByRole('button', { name: 'Aprovar cadastro' })).toBeDisabled();
		await user.type(screen.getByLabelText('Parecer da análise'), 'Documentos e titularidade conferidos');
		await user.click(screen.getByRole('checkbox', { name: /Conferi os documentos/ }));
		await user.click(screen.getByRole('button', { name: 'Aprovar cadastro' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				'/api/super-admin/organizers/org/receiving-account/request-1/review',
				expect.objectContaining({
					method: 'POST',
					body: JSON.stringify({
						decision: 'approved',
						reason: 'Documentos e titularidade conferidos',
						documents_checked: true,
					}),
				}),
			),
		);
	});
	it('reports concurrent changes rather than showing a false approval', async () => {
		mockFetch([
			[/\/review$/, () => problemResponse(409, 'RECEIVING_REQUEST_CHANGED', 'Os dados foram substituídos.')],
			[/receiving-account/, () => jsonResponse(data)],
		]);
		const { user } = renderWithProviders(
			<>
				<ReceivingReviewPanel organizerId="org" />
				<Toaster />
			</>,
		);
		await screen.findByText('ana@example.com');
		await user.type(screen.getByLabelText('Parecer da análise'), 'Documento ilegível');
		await user.click(screen.getByRole('checkbox', { name: /Conferi os documentos/ }));
		await user.click(screen.getByRole('button', { name: 'Rejeitar e solicitar correção' }));
		expect(await screen.findByText('Os dados foram substituídos.')).toBeInTheDocument();
	});
});
