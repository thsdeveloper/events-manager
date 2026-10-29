import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * A caixa horizontal do conteúdo público: mesma largura máxima e mesmo recuo
 * lateral em toda a página. Blocos que repetem `max-w-7xl` com o seu próprio
 * padding acabam desalinhados entre si — é para isso que este atom existe.
 */
export function Container<T extends ElementType = 'div'>({
	as,
	children,
	className,
	...props
}: { as?: T; children: ReactNode; className?: string } & Omit<
	ComponentPropsWithoutRef<T>,
	'as' | 'children' | 'className'
>) {
	const Component = (as ?? 'div') as ElementType;

	return (
		<Component className={cn('mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8', className)} {...props}>
			{children}
		</Component>
	);
}
