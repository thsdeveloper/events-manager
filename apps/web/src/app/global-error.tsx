'use client';

import { useEffect } from 'react';
import { PageErrorState } from '@/components/design-system/molecules/PageErrorState';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
	useEffect(() => {
		console.error('Application shell failed', { digest: error.digest, message: error.message });
	}, [error]);

	return (
		<html lang="pt-BR">
			<body>
				<main id="main-content" tabIndex={-1}>
					<PageErrorState
						description="A estrutura principal da aplicação não pôde ser carregada. Tente novamente para restabelecer a sessão."
						onRetry={reset}
						title="Não foi possível iniciar a aplicação"
					/>
				</main>
			</body>
		</html>
	);
}
