import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';

export default function ExamplesLayout({ children }: { children: ReactNode }) {
	if (process.env.NODE_ENV !== 'development') notFound();

	return (
		<main id="main-content" tabIndex={-1}>
			{children}
		</main>
	);
}
