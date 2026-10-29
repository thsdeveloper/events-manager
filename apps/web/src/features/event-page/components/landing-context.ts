import type { Event } from '@events-manager/contracts';

export type LandingMode = 'live' | 'preview';

/** O que toda seção precisa saber além dos próprios campos. */
export interface LandingContext {
	checkoutHref: string;
	event: Event;
	mode: LandingMode;
	/** Âncora da seção de ingressos visível, alvo dos botões de compra; nula se não houver. */
	ticketsAnchor: string | null;
}

export function organizerOf(event: Event) {
	const organizer = event.organizer_id;

	return organizer && typeof organizer === 'object' ? organizer : null;
}
