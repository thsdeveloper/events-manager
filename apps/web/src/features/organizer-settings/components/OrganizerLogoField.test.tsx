import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { jsonResponse, mockFetch, renderWithProviders } from '@/test';
import { OrganizerLogoField } from './OrganizerLogoField';
import { Toaster } from '@/components/ui/toaster';
const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => router }));

describe('OrganizerLogoField', () => {
	it('removes the saved logo through the API before refreshing the sidebar', async () => {
		const network = mockFetch([['/api/organizer/logo', () => jsonResponse({ success: true })]]);
		const { user } = renderWithProviders(<OrganizerLogoField logo="old-logo" />);
		await user.click(screen.getByRole('button', { name: 'Remover' }));
		await waitFor(() =>
			expect(network).toHaveBeenCalledWith('/api/organizer/logo', expect.objectContaining({ method: 'DELETE' })),
		);
		expect(screen.queryByRole('img', { name: 'Logo da organização' })).not.toBeInTheDocument();
		expect(router.refresh).toHaveBeenCalled();
	});
	it('keeps the saved logo visible when removal fails', async () => {
		mockFetch([['/api/organizer/logo', () => jsonResponse({ detail: 'Tente novamente' }, { status: 500 })]]);
		const { user } = renderWithProviders(<OrganizerLogoField logo="old-logo" />);
		await user.click(screen.getByRole('button', { name: 'Remover' }));
		await waitFor(() => expect(screen.getByRole('button', { name: 'Trocar logo' })).toBeEnabled());
		expect(screen.getByRole('img', { name: 'Logo da organização' })).toBeInTheDocument();
	});
});

it.each([
	[true, false],
	[false, false],
	[true, true],
])(
	'keeps the uploaded preview and reports cleanup problems (success: %s, cleanup pending: %s)',
	async (success, cleanupPending) => {
		const { fireEvent, within } = await import('@testing-library/react');
		Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:crop-preview') });
		Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() });
		vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
			width: 500,
			height: 380,
			x: 0,
			y: 0,
			top: 0,
			left: 0,
			right: 500,
			bottom: 380,
			toJSON: () => ({}),
		});
		vi.stubGlobal(
			'Image',
			class {
				onload: (() => void) | null = null;
				set src(_value: string) {
					queueMicrotask(() => this.onload?.());
				}
			},
		);
		vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
			drawImage: vi.fn(),
		} as unknown as CanvasRenderingContext2D);
		vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
			callback(new Blob(['cropped-png'], { type: 'image/png' })),
		);
		const network = mockFetch([
			[
				'/api/organizer/logo',
				() =>
					success
						? jsonResponse({ file: { file: { id: 'new-logo' } }, cleanupPending })
						: jsonResponse({ detail: 'Falha ao salvar' }, { status: 500 }),
			],
		]);
		const { user } = renderWithProviders(
			<>
				<OrganizerLogoField logo="old-logo" />
				<Toaster />
			</>,
		);
		await user.upload(
			screen.getByLabelText('Imagem da organização'),
			new File(['rectangular-image'], 'logo.jpg', { type: 'image/jpeg' }),
		);
		const dialog = await screen.findByRole('dialog', { name: 'Ajustar logo' });
		const img = within(dialog).getByRole('presentation');
		Object.defineProperties(img, {
			naturalWidth: { value: 1000 },
			naturalHeight: { value: 500 },
			width: { value: 500 },
			height: { value: 250 },
		});
		fireEvent.load(img);
		await waitFor(() => expect(screen.getByRole('button', { name: 'Salvar logo' })).toBeEnabled());
		await user.click(screen.getByRole('button', { name: 'Salvar logo' }));
		await waitFor(() =>
			expect(screen.getByRole('img', { name: 'Logo da organização' })).toHaveAttribute(
				'src',
				`/api/media/${success ? 'new-logo' : 'old-logo'}`,
			),
		);
		const payload = network.mock.calls[0][1]?.body as FormData;
		expect(payload.get('file')).toMatchObject({ name: 'logo.png', type: 'image/png' });
		expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:crop-preview');
		if (cleanupPending) expect(await screen.findByText('Logo atualizada; limpeza pendente')).toBeInTheDocument();
	},
);
