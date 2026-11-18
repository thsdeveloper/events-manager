import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ReceivingAccountOverview } from '@events-manager/contracts';
import { renderWithProviders, mockFetch, jsonResponse, problemResponse } from '@/test';
import { Toaster } from '@/components/ui/toaster';
import { ReceivingAccountPage } from './ReceivingAccountPage';
const id = '10000000-0000-4000-8000-000000000001';
const base = `/api/organizer/receiving-accounts/${id}`;
const initialData: ReceivingAccountOverview = {
	organizer: {
		id,
		name: 'Produtora A',
		document: '45723174000110',
		status: 'active',
		payout_status: 'not_configured',
		production_approved_at: null,
		current_receiving_request_id: null,
	},
	current: null,
	history: [],
	pagination: { page: 1, limit: 10, total: 0, pageCount: 0 },
};
function renderPage(data = initialData) {
	return renderWithProviders(
		<>
			<ReceivingAccountPage initialData={data} />
			<Toaster />
		</>,
	);
}
describe('organizer receiving onboarding', () => {
	it('explains documents, review and production approval; offers PIX and bank transfer', async () => {
		mockFetch([]);
		const { user } = renderPage();
		expect(screen.getByRole('heading', { name: 'Recebimento e verificação' })).toBeInTheDocument();
		expect(screen.getByText(/Após a aprovação, sua conta é liberada/)).toBeInTheDocument();
		expect(screen.getByLabelText('Chave PIX')).toBeInTheDocument();
		await user.click(screen.getByRole('radio', { name: 'Transferência bancária' }));
		expect(screen.getByLabelText('Número da conta')).toBeInTheDocument();
		expect(screen.queryByLabelText('Chave PIX')).not.toBeInTheDocument();
		expect(screen.getByLabelText(/Comprovante da empresa/)).toBeInTheDocument();
	});
	it('uploads private documents and submits the selected destination for review, without status or reviewer fields', async () => {
		const uploaded: string[] = [];
		const fetchMock = mockFetch([
			[
				new RegExp(`${base}/documents`),
				() => {
					const docId = `20000000-0000-4000-8000-00000000000${uploaded.length + 1}`;
					uploaded.push(docId);

					return jsonResponse({ document: { id: docId, filename: 'doc.pdf' } });
				},
			],
			[
				base,
				(_url, init) =>
					init?.method === 'POST' ? jsonResponse({ id: 'new-request' }, { status: 201 }) : jsonResponse(initialData),
			],
		]);
		const { user } = renderPage();
		await user.type(screen.getByLabelText('Nome do titular'), 'Produtora A');
		await user.selectOptions(screen.getByLabelText('Tipo de chave PIX'), 'EMAIL');
		await user.type(screen.getByLabelText('Chave PIX'), 'titular@example.com');
		for (const name of ['Documento do responsável', 'Comprovante da empresa', 'Comprovante de titularidade da conta']) {
			await user.upload(
				screen.getByLabelText(new RegExp(name)),
				new File(['%PDF-test'], 'doc.pdf', { type: 'application/pdf' }),
			);
			await waitFor(() => expect(uploaded.length).toBeGreaterThan(0));
		}
		await user.click(screen.getByRole('checkbox', { name: /Confirmo a titularidade/ }));
		await user.click(screen.getByRole('button', { name: 'Enviar para análise' }));
		await waitFor(() =>
			expect(fetchMock).toHaveBeenCalledWith(
				base,
				expect.objectContaining({ method: 'POST', body: expect.stringContaining('"document_ids"') }),
			),
		);
		const call = fetchMock.mock.calls.find(([url, init]) => url === base && init?.method === 'POST');
		const sent = JSON.parse(String(call?.[1]?.body));
		expect(sent.account).toMatchObject({
			method: 'pix',
			holder_document: '45723174000110',
			pix_key: 'titular@example.com',
		});
		expect(sent.document_ids).toHaveLength(3);
		expect(sent.status).toBeUndefined();
	});
	it('keeps entered data and shows the standard toast when submission is rejected', async () => {
		mockFetch([
			[
				new RegExp(`${base}/documents`),
				() => jsonResponse({ document: { id: crypto.randomUUID(), filename: 'doc.pdf' } }),
			],
			[base, () => problemResponse(409, 'RECEIVING_REQUEST_CHANGED', 'Existe uma solicitação mais recente.')],
		]);
		const { user } = renderPage({ ...initialData, organizer: { ...initialData.organizer, document: '52998224725' } });
		await user.type(screen.getByLabelText('Nome do titular'), 'Ana Silva');
		await user.type(screen.getByLabelText('Chave PIX'), '52998224725');
		for (const label of ['Documento do responsável', 'Comprovante de titularidade da conta'])
			await user.upload(
				screen.getByLabelText(new RegExp(label)),
				new File(['%PDF-x'], 'doc.pdf', { type: 'application/pdf' }),
			);
		await user.click(screen.getByRole('checkbox', { name: /Confirmo a titularidade/ }));
		await user.click(screen.getByRole('button', { name: 'Enviar para análise' }));
		expect(await screen.findByText('Existe uma solicitação mais recente.')).toBeInTheDocument();
		expect(screen.getByLabelText('Chave PIX')).toHaveValue('52998224725');
	});
});
