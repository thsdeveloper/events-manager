import type { OrganizerDashboard } from '@events-manager/contracts';
import { CalendarDays } from 'lucide-react';
import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { OrganizerDashboardOverview } from './organisms/OrganizerDashboardOverview';
import { PageHeader } from './molecules/PageHeader';
import { PageLoadingState } from './molecules/PageLoadingState';
import { formatCurrency, formatDateTime, formatInteger } from '@/lib/formatters';

vi.mock('next/link', () => ({
	default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

const emptyDashboard: OrganizerDashboard = {
	metrics: {
		grossRevenue: 0,
		participants: 0,
		publishedEvents: 0,
		ticketsSold: 0,
		totalEvents: 0,
		upcomingEvents: 0,
	},
	recentEvents: [],
};

describe('design system', () => {
	it('renders a semantic page header with optional context', () => {
		const markup = renderToStaticMarkup(
			<PageHeader description="Resumo confiável" eyebrow="Organizador" title="Visão geral" />,
		);

		expect(markup).toContain('<header');
		expect(markup).toContain('<h1');
		expect(markup).toContain('Visão geral');
		expect(markup).toContain('Resumo confiável');
	});

	it('renders an actionable empty dashboard instead of a blank panel', () => {
		const markup = renderToStaticMarkup(<OrganizerDashboardOverview dashboard={emptyDashboard} />);

		expect(markup).toContain('Sua agenda começa aqui');
		expect(markup).toContain('Criar primeiro evento');
		expect(markup).toContain('Indicadores do organizador');
	});

	it('keeps decorative icons hidden from assistive technology', () => {
		const markup = renderToStaticMarkup(<CalendarDays aria-hidden="true" />);

		expect(markup).toContain('aria-hidden="true"');
	});

	it('announces route transitions without exposing skeletons as content', () => {
		const markup = renderToStaticMarkup(<PageLoadingState label="Carregando painel" />);

		expect(markup).toContain('role="status"');
		expect(markup).toContain('aria-busy="true"');
		expect(markup).toContain('Carregando painel');
	});
});

describe('localized formatters', () => {
	it('formats dashboard values for Brazilian Portuguese', () => {
		expect(formatInteger(1234)).toMatch(/1\.234/);
		expect(formatCurrency(12450.5)).toMatch(/R\$\s*12\.450,50/);
		expect(formatDateTime('2026-09-10T18:00:00.000Z')).toMatch(/2026/);
	});
});
