'use client';

import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type * as React from 'react';

/**
 * Single source of truth for the color scheme.
 *
 * next-themes owns the `light`/`dark` class on <html>, the `system` resolution
 * and the localStorage persistence — nothing else may touch them. An earlier
 * version kept a parallel useState/localStorage copy here; because parent
 * effects run after child effects, it overwrote whatever next-themes had just
 * applied and, for the `system` preference, put a meaningless `system` class on
 * <html> instead of the resolved one — which is why "Sistema" always rendered
 * as light.
 */
export function ThemeProvider({ children, ...props }: React.ComponentProps<typeof NextThemesProvider>) {
	return (
		<NextThemesProvider
			attribute="class"
			defaultTheme="system"
			disableTransitionOnChange
			enableSystem
			storageKey="theme"
			themes={['light', 'dark']}
			{...props}
		>
			{children}
		</NextThemesProvider>
	);
}
