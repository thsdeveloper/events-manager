'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState } from 'react';

const queryClientConfig = {
	defaultOptions: {
		queries: {
			staleTime: 60 * 1000,
			gcTime: 5 * 60 * 1000,
			retry: 2,
			refetchOnWindowFocus: false,
		},
	},
} satisfies ConstructorParameters<typeof QueryClient>[0];

export function ReactQueryProvider({ children }: { children: ReactNode }) {
	const [client] = useState(() => new QueryClient(queryClientConfig));

	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
