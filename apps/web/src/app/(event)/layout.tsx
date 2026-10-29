import type { ReactNode } from 'react';

/**
 * A página do evento decide a própria casca: a landing montada pelo organizador
 * vive sem o menu e o rodapé do site, e o layout padrão os traz de volta por
 * conta própria. Por isso este grupo não envolve nada.
 */
export default function EventLayout({ children }: { children: ReactNode }) {
	return children;
}
