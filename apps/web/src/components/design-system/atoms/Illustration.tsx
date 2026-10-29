import type { Illustration as IllustrationArt } from '@/lib/illustrations';
import { cn } from '@/lib/utils';

interface IllustrationProps {
	illustration: IllustrationArt;
	className?: string;
}

/**
 * Ilustração puramente decorativa: o texto ao lado já diz tudo, então ela fica
 * fora da árvore de acessibilidade. A altura vem da classe; a largura segue
 * a proporção declarada no registro, o que evita salto de layout.
 */
export function Illustration({ illustration, className }: IllustrationProps) {
	return (
		<img
			src={illustration.src}
			alt=""
			aria-hidden="true"
			width={illustration.width}
			height={illustration.height}
			decoding="async"
			className={cn('h-36 w-auto max-w-full', className)}
		/>
	);
}
