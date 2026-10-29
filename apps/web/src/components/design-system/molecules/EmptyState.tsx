import type { ReactNode } from 'react';
import type { Illustration as IllustrationArt } from '@/lib/illustrations';
import { Heading } from '../atoms/Heading';
import { IconSurface } from '../atoms/IconSurface';
import { Illustration } from '../atoms/Illustration';

export function EmptyState({
	action,
	description,
	icon,
	illustration,
	title,
}: {
	action?: ReactNode;
	description: string;
	icon: ReactNode;
	/** Quando presente, a ilustração substitui o chip de ícone. */
	illustration?: IllustrationArt;
	title: string;
}) {
	return (
		<div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed bg-muted/20 px-6 py-12 text-center">
			{illustration ? (
				<Illustration illustration={illustration} className="mb-5 h-36" />
			) : (
				<IconSurface className="mb-4 size-12" tone="neutral">
					{icon}
				</IconSurface>
			)}
			<Heading level="h3">{title}</Heading>
			<p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
			{action ? <div className="mt-6">{action}</div> : null}
		</div>
	);
}
