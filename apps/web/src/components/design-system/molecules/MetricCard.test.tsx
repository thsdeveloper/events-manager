import { render, screen } from '@testing-library/react';
import { CalendarDays } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { MetricCard } from './MetricCard';

describe('MetricCard', () => {
	it('shows a metric with optional context without an empty helper when none is supplied', () => {
		const { rerender } = render(
			<MetricCard label="Eventos" value="12" icon={<CalendarDays />} helper="3 publicados" />,
		);
		expect(screen.getByText('Eventos')).toBeInTheDocument();
		expect(screen.getByText('12')).toBeInTheDocument();
		expect(screen.getByText('3 publicados')).toBeInTheDocument();
		rerender(<MetricCard label="Eventos" value="0" icon={<CalendarDays />} />);
		expect(screen.getByText('0')).toBeInTheDocument();
		expect(screen.queryByText('3 publicados')).not.toBeInTheDocument();
	});
});
