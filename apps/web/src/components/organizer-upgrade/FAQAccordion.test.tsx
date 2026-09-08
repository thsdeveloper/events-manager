import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithProviders } from '@/test';
import { FAQAccordion } from './FAQAccordion';

describe('FAQAccordion', () => {
	it('lists the questions with the answers collapsed and opens one on demand', async () => {
		const { user } = renderWithProviders(<FAQAccordion />);

		const question = screen.getByRole('button', { name: /pagamento parcelado/i });
		expect(question).toHaveAttribute('aria-expanded', 'false');
		expect(screen.queryByText(/você define o número máximo de parcelas/i)).not.toBeInTheDocument();

		await user.click(question);

		expect(question).toHaveAttribute('aria-expanded', 'true');
		expect(screen.getByText(/você define o número máximo de parcelas/i)).toBeInTheDocument();
	});

	it('filters by search term and by category, and explains when nothing matches', async () => {
		const { user } = renderWithProviders(<FAQAccordion />);
		const list = () => screen.getByRole('list', { name: /perguntas/i });

		await user.click(screen.getByRole('button', { name: /^recursos$/i }));
		expect(within(list()).getAllByRole('listitem').length).toBeGreaterThan(0);
		expect(within(list()).queryByRole('button', { name: /aprovad/i })).not.toBeInTheDocument();

		await user.click(screen.getByRole('button', { name: /^todas$/i }));
		await user.type(screen.getByRole('searchbox', { name: /buscar/i }), 'parcelado');
		expect(within(list()).getAllByRole('listitem')).toHaveLength(1);

		await user.clear(screen.getByRole('searchbox', { name: /buscar/i }));
		await user.type(screen.getByRole('searchbox', { name: /buscar/i }), 'xyzabc');
		expect(screen.getByText(/nenhuma pergunta encontrada/i)).toBeInTheDocument();
	});

	it('talks about creating the account, not about a request under review', () => {
		renderWithProviders(<FAQAccordion />);

		expect(screen.queryByText(/solicitação/i)).not.toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(/perguntas/i);
	});
});
