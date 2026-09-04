import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type IconTone = 'brand' | 'info' | 'success' | 'warning' | 'neutral';

const toneStyles: Record<IconTone, string> = {
	brand: 'bg-primary/10 text-primary',
	info: 'bg-info/10 text-info',
	success: 'bg-success/10 text-success',
	warning: 'bg-warning/10 text-warning',
	neutral: 'bg-muted text-muted-foreground',
};

export function IconSurface({
	children,
	className,
	tone = 'brand',
}: {
	children: ReactNode;
	className?: string;
	tone?: IconTone;
}) {
	return (
		<span
			className={cn('inline-flex size-11 shrink-0 items-center justify-center rounded-lg', toneStyles[tone], className)}
		>
			{children}
		</span>
	);
}
