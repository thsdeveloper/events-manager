/**
 * Ilustrações decorativas do produto (Icons8 Ouch, estilo "neat"), uma por
 * estado vazio. O tamanho é o intrínseco do desenho: os SVGs vêm só com
 * `viewBox`, então o `<img>` precisa dos números para não colapsar. Os ids
 * de origem e a licença estão em `ouch.json`.
 */
export interface Illustration {
	src: string;
	width: number;
	height: number;
}

export const emptyIllustrations = {
	/** Organizador sem eventos criados. */
	events: { src: '/images/empty/events.svg', width: 334, height: 376 },
	/** Visão geral do painel antes do primeiro evento. */
	overview: { src: '/images/empty/overview.svg', width: 750, height: 750 },
	/** Busca ou filtro sem resultados. */
	search: { src: '/images/empty/search.svg', width: 428, height: 486 },
	/** Financeiro sem transações. */
	transactions: { src: '/images/empty/transactions.svg', width: 812, height: 470 },
	/** Pessoa sem ingressos comprados. */
	tickets: { src: '/images/empty/tickets.svg', width: 1207, height: 883 },
	/** Pessoa sem pagamentos. */
	payments: { src: '/images/empty/payments.svg', width: 433, height: 603 },
	/** Página não encontrada. */
	notFound: { src: '/images/empty/not-found.svg', width: 1647, height: 887 },
} as const satisfies Record<string, Illustration>;
