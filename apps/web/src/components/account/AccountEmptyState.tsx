'use client';

import type { ReactNode } from 'react';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import { cn } from '@/lib/utils';

interface AccountEmptyStateProps {
	/** An animate-ui icon (e.g. `<Ticket />`); it animates on view and on hover. */
	icon: ReactNode;
	title: string;
	description: string;
	action?: ReactNode;
	className?: string;
}

/**
 * The one empty state for the account area ("Meus ingressos", "Pagamentos"...).
 * Same panel as the other /perfil blocks, a neutral icon chip and copy that says
 * what will show up here and how. The icon draws itself when the panel scrolls
 * into view and again on hover, which is the only motion the panel needs.
 */
export function AccountEmptyState({ icon, title, description, action, className }: AccountEmptyStateProps) {
	return (
		<div
			className={cn(
				'rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-14',
				className,
			)}
		>
			<AnimateIcon animateOnView animateOnViewOnce animateOnHover asChild>
				<span
					aria-hidden="true"
					className="mx-auto flex size-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 [&_svg]:size-6"
				>
					{icon}
				</span>
			</AnimateIcon>
			<h2 className="mt-4 font-semibold text-slate-950 dark:text-white">{title}</h2>
			<p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">{description}</p>
			{action ? <div className="mt-6 flex justify-center">{action}</div> : null}
		</div>
	);
}
