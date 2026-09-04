import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export function InlineAlert({ children, tone = 'danger' }: { children: ReactNode; tone?: 'danger' | 'info' }) {
	return (
		<div
			role={tone === 'danger' ? 'alert' : 'status'}
			className={cn(
				'flex items-start gap-2 rounded-lg border px-4 py-3 text-sm',
				tone === 'danger'
					? 'border-destructive/25 bg-destructive/10 text-destructive'
					: 'border-primary/20 bg-primary/5 text-foreground',
			)}
		>
			<AlertCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
			<div>{children}</div>
		</div>
	);
}
