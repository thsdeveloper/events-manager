import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps {
	title: ReactNode;
	description?: ReactNode;
	eyebrow?: string;
	actions?: ReactNode;
	className?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className }: PageHeaderProps) {
	return (
		<header className={cn('flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between', className)}>
			<div className="flex min-w-0 items-start gap-3">
				<div className="min-w-0 space-y-2">
					{eyebrow ? <p className="text-sm font-medium text-muted-foreground">{eyebrow}</p> : null}
					<h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
					{description ? <div className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</div> : null}
				</div>
			</div>
			{actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
		</header>
	);
}
