import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import type { CmsSeo } from '@events-manager/contracts';
import { renderWithProviders } from '@/test';
import { SeoFields } from './SeoFields';

vi.mock('next/image', () => ({
	default: ({ alt, src }: { alt: string; src: string }) => <img alt={alt} src={src} />,
}));

function Harness({ initial }: { initial: CmsSeo | null }) {
	const [seo, setSeo] = useState<CmsSeo | null>(initial);

	return <SeoFields value={seo} onChange={setSeo} url="https://eventos.local/sobre" fallbackTitle="Sobre nós" />;
}

describe('SeoFields', () => {
	it(
		'caps the title at 70 and the description at 160 characters and shows the counters',
		{ timeout: 20_000 },
		async () => {
			const { user } = renderWithProviders(<Harness initial={null} />);

			const title = screen.getByLabelText(/título seo/i);
			await user.click(title);
			await user.paste('a'.repeat(75));
			expect(title).toHaveValue('a'.repeat(70));
			expect(screen.getByText('70/70')).toBeInTheDocument();

			const description = screen.getByLabelText(/meta description/i);
			await user.click(description);
			await user.paste('b'.repeat(165));
			expect(description).toHaveValue('b'.repeat(160));
			expect(screen.getByText('160/160')).toBeInTheDocument();
		},
	);

	it('previews the result the way a search engine would show it', async () => {
		const { user } = renderWithProviders(<Harness initial={null} />);

		const preview = screen.getByRole('region', { name: /pré-visualização na busca/i });
		expect(within(preview).getByText('Sobre nós')).toBeInTheDocument();
		expect(within(preview).getByText('https://eventos.local/sobre')).toBeInTheDocument();

		await user.type(screen.getByLabelText(/título seo/i), 'Quem somos');
		await user.type(screen.getByLabelText(/meta description/i), 'Conheça a equipe.');

		expect(within(preview).getByText('Quem somos')).toBeInTheDocument();
		expect(within(preview).getByText('Conheça a equipe.')).toBeInTheDocument();
	});

	it('exposes indexing toggles and sitemap settings', async () => {
		const { user } = renderWithProviders(<Harness initial={{ no_index: false, no_follow: false }} />);

		await user.click(screen.getByRole('checkbox', { name: /não indexar/i }));
		expect(screen.getByRole('checkbox', { name: /não indexar/i })).toBeChecked();
		expect(screen.getByLabelText(/frequência/i)).toBeInTheDocument();
		expect(screen.getByLabelText(/prioridade/i)).toBeInTheDocument();
	});
});
