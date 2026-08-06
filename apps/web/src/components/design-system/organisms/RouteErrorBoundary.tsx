'use client';

import { useEffect } from 'react';
import { PageErrorState } from '../molecules/PageErrorState';

export function RouteErrorBoundary({
	description,
	error,
	reset,
	title,
}: {
	description?: string;
	error: Error & { digest?: string };
	reset: () => void;
	title?: string;
}) {
	useEffect(() => {
		console.error('Route rendering failed', { digest: error.digest, message: error.message });
	}, [error]);

	return <PageErrorState description={description} onRetry={reset} title={title} />;
}
