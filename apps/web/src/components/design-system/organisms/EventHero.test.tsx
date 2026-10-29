/**
 * A capa do evento é a primeira coisa que a pessoa lê na página pública. Ela
 * precisa anunciar o evento de forma semântica (um único `h1`), dizer a que
 * categoria e formato ele pertence, e quando acontece.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EventHero } from './EventHero';

vi.mock('@/components/shared/MediaImage', () => ({
	default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

const baseProps = {
	category: { name: 'Religioso', icon: 'church', color: '#6366f1' },
	coverImage: null,
	dateLabel: '19 a 21 de setembro',
	formatLabel: 'Presencial',
	timeLabel: 'sábado e segunda-feira às 16:00',
	title: 'Congresso de Jovens da ADEB',
};

describe('EventHero', () => {
	it('announces the event as the page main heading', () => {
		render(<EventHero {...baseProps} />);

		expect(screen.getByRole('heading', { level: 1, name: 'Congresso de Jovens da ADEB' })).toBeInTheDocument();
	});

	it('shows the category, the format and when the event happens', () => {
		render(<EventHero {...baseProps} />);

		expect(screen.getByText('Religioso')).toBeInTheDocument();
		// O `icon` da categoria é uma chave do catálogo (`church`), não um emoji:
		// imprimi-lo direto vazaria o nome técnico do ícone sobre a capa.
		expect(screen.queryByText('church')).not.toBeInTheDocument();
		expect(screen.getByText('Presencial')).toBeInTheDocument();
		expect(screen.getByText('19 a 21 de setembro')).toBeInTheDocument();
		expect(screen.getByText('sábado e segunda-feira às 16:00')).toBeInTheDocument();
		expect(screen.getByText('Data')).toBeInTheDocument();
		expect(screen.getByText('Horário')).toBeInTheDocument();
	});

	it('flags a free event only when it is free', () => {
		const { rerender } = render(<EventHero {...baseProps} />);
		expect(screen.queryByText('Gratuito')).not.toBeInTheDocument();

		rerender(<EventHero {...baseProps} isFree />);
		expect(screen.getByText('Gratuito')).toBeInTheDocument();
	});

	it('keeps the cover accessible through its alt text', () => {
		render(<EventHero {...baseProps} coverImage="11111111-1111-4111-8111-111111111111" />);

		expect(screen.getByAltText('Congresso de Jovens da ADEB')).toBeInTheDocument();
	});

	it('shows the event without a cover instead of leaving a hole in the page', () => {
		render(<EventHero {...baseProps} coverImage={null} />);

		expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
		expect(screen.queryByAltText('Congresso de Jovens da ADEB')).not.toBeInTheDocument();
	});
});
