import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type OverlayBadgeTone = 'glass' | 'success';

const toneStyles: Record<OverlayBadgeTone, string> = {
	glass: 'border-white/30 bg-white/20',
	success: 'border-white/30 bg-success',
};

/**
 * Selo lido por cima de uma imagem. O vidro fosco garante contraste sobre capas
 * claras ou escuras sem depender do tema.
 */
export function OverlayBadge({
	accentColor,
	children,
	className,
	icon: Icon,
	tone = 'glass',
}: {
	accentColor?: string | null;
	children: ReactNode;
	className?: string;
	icon?: LucideIcon;
	tone?: OverlayBadgeTone;
}) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-2 rounded-none border px-3 py-1.5 text-xs font-semibold text-white shadow-sm backdrop-blur-md sm:text-sm',
				toneStyles[tone],
				className,
			)}
			style={accentColor ? { backgroundColor: `${accentColor}99` } : undefined}
		>
			{Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
			{children}
		</span>
	);
}
