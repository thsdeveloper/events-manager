'use client';
import type { MouseEvent, ReactNode } from 'react';
/** Mantém o conteúdo legível, mas impede navegação de links na prévia. */
export function EventPreviewSurface({ children }: { children: ReactNode }) {
	const stay = (event: MouseEvent<HTMLDivElement>) => {
		const target = event.target as Element;
		if (target.closest?.('a')) event.preventDefault();
	};

	return (
		<div onClickCapture={stay} onAuxClickCapture={stay}>
			{children}
		</div>
	);
}
