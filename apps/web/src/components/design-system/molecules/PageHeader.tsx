import type { ReactNode } from 'react';
import { Heading } from '../atoms/Heading';

export function PageHeader({
	actions,
	description,
	eyebrow,
	title,
}: {
	actions?: ReactNode;
	description?: string;
	eyebrow?: string;
	title: string;
}) {
	return (
		<header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
			<div className="max-w-3xl space-y-2">
				{eyebrow ? <p className="text-sm font-semibold text-primary">{eyebrow}</p> : null}
				<Heading level="h1">{title}</Heading>
				{description ? (
					<p className="text-pretty text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
				) : null}
			</div>
			{actions ? <div className="flex shrink-0 flex-wrap items-center gap-3">{actions}</div> : null}
		</header>
	);
}
