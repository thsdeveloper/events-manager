'use client';

import { ProgressProvider } from '@bprogress/next/app';
import type { ReactNode } from 'react';

/**
 * Top-of-page navigation indicator for every App Router route transition.
 *
 * `--accent-color` is set on <html> by the root layout from the site settings,
 * so the bar follows whatever brand colour the super admin configured instead
 * of hardcoding one here.
 */
export function AppProgressProvider({ children }: { children: ReactNode }) {
	return (
		<ProgressProvider
			height="3px"
			color="var(--accent-color)"
			// Navigations served from the client cache finish in a few frames; without
			// a delay the bar would flash in and out and read as a glitch.
			delay={150}
			// The app already signals work through skeletons and toasts — a corner
			// spinner on top of those is noise.
			options={{ showSpinner: false }}
		>
			{children}
		</ProgressProvider>
	);
}
