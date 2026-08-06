'use client';

import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Heading } from '../atoms/Heading';
import { IconSurface } from '../atoms/IconSurface';

export function PageErrorState({
	description = 'Não foi possível carregar esta página. Verifique sua conexão e tente novamente.',
	onRetry,
	title = 'Algo deu errado',
}: {
	description?: string;
	onRetry: () => void;
	title?: string;
}) {
	return (
		<div className="flex min-h-[420px] items-center justify-center px-4">
			<div className="max-w-lg text-center" role="alert">
				<IconSurface className="mx-auto mb-5 size-14" tone="warning">
					<AlertTriangle aria-hidden="true" className="size-7" />
				</IconSurface>
				<Heading level="h2">{title}</Heading>
				<p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
				<Button className="mt-6" onClick={onRetry}>
					<RotateCcw aria-hidden="true" className="size-4" />
					Tentar novamente
				</Button>
			</div>
		</div>
	);
}
