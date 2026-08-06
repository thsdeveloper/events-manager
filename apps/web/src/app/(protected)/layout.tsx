import type { ReactNode } from 'react';

export default function ProtectedLayout({ children }: { children: ReactNode }) {
	return (
		<main className="min-h-screen bg-background" id="main-content" tabIndex={-1}>
			{children}
		</main>
	);
}
