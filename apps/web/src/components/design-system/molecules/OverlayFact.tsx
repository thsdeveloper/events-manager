import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Par rótulo/valor sobre uma imagem — data, horário, local. Mantém o mesmo
 * vidro fosco do `OverlayBadge` para que a faixa de capa leia como um conjunto.
 */
export function OverlayFact({
	icon: Icon,
	label,
	value,
	valueClassName,
}: {
	icon: LucideIcon;
	label: string;
	value: string;
	valueClassName?: string;
}) {
	return (
		<div className="flex items-center gap-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-md">
			<Icon className="size-5 shrink-0 text-white" aria-hidden />
			<div>
				<p className="text-xs font-medium text-white/70">{label}</p>
				<p className={cn('text-sm font-semibold text-white', valueClassName)}>{value}</p>
			</div>
		</div>
	);
}
