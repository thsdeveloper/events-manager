import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4';

const headingStyles: Record<HeadingLevel, string> = {
	h1: 'text-3xl font-semibold tracking-tight sm:text-4xl',
	h2: 'text-2xl font-semibold tracking-tight sm:text-3xl',
	h3: 'text-lg font-semibold tracking-tight sm:text-xl',
	h4: 'text-base font-semibold tracking-tight',
};

interface HeadingProps<T extends ElementType = HeadingLevel> {
	as?: T;
	children: ReactNode;
	className?: string;
	level?: HeadingLevel;
}

export function Heading<T extends ElementType = HeadingLevel>({
	as,
	children,
	className,
	level = 'h2',
	...props
}: HeadingProps<T> & Omit<ComponentPropsWithoutRef<T>, keyof HeadingProps<T>>) {
	const Component = as ?? level;

	return (
		<Component className={cn('text-balance font-heading text-foreground', headingStyles[level], className)} {...props}>
			{children}
		</Component>
	);
}
