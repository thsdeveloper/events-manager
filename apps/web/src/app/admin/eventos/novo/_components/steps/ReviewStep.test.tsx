import { screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useForm, FormProvider } from 'react-hook-form';
import { renderWithProviders } from '@/test';
import { ReviewStep } from './ReviewStep';
import type { EventWizardFormValues } from '../types';
function Host({ preview }: { preview?: string }) {
	const form = useForm<EventWizardFormValues>({
		defaultValues: {
			title: 'Encontro Flouvi',
			tickets: [],
			status: 'draft',
			cover_image: preview ? 'local-file' : 'https://example.com/cover.png',
			cover_image_alt: 'Pessoas em um encontro',
		},
	});

	return (
		<FormProvider {...form}>
			<ReviewStep categories={[]} coverPreviewUrl={preview} />
		</FormProvider>
	);
}
describe('review cover', () => {
	it('shows the image selected locally before upload', () => {
		renderWithProviders(<Host preview="blob:local-cover" />);
		expect(screen.getByRole('img', { name: 'Pessoas em um encontro' })).toHaveAttribute('src', 'blob:local-cover');
	});
	it('shows an already uploaded cover', () => {
		renderWithProviders(<Host />);
		expect(screen.getByRole('img', { name: 'Pessoas em um encontro' })).toHaveAttribute(
			'src',
			expect.stringContaining('cover.png'),
		);
	});
});
