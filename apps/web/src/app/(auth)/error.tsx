'use client';

import { RouteErrorBoundary } from '@/components/design-system/organisms/RouteErrorBoundary';

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	return <RouteErrorBoundary error={error} reset={reset} title="Não foi possível abrir o acesso" />;
}
