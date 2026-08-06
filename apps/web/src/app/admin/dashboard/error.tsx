'use client';

import { useEffect } from 'react';
import { PageErrorState } from '@/components/design-system/molecules/PageErrorState';

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error('Organizer dashboard error', error);
	}, [error]);

	return (
		<PageErrorState
			description="Os indicadores do seu workspace não puderam ser carregados agora. Seus dados continuam seguros."
			onRetry={reset}
			title="Não foi possível abrir a visão geral"
		/>
	);
}
