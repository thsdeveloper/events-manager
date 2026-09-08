import type { ReactNode } from 'react';

export function CmsPageHeader({
	eyebrow = 'Conteúdo',
	title,
	description,
	actions,
}: {
	eyebrow?: string;
	title: string;
	description?: string;
	actions?: ReactNode;
}) {
	return (
		<header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
			<div>
				<p className="text-sm font-semibold text-violet-700">{eyebrow}</p>
				<h1 className="mt-1 text-3xl font-bold tracking-tight">{title}</h1>
				{description && <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
			</div>
			{actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
		</header>
	);
}
