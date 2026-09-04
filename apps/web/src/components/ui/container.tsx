import { PropsWithChildren } from 'react';
import { cn } from '@/lib/utils';

type SemanticElement = 'div' | 'section' | 'main' | 'article' | 'aside' | 'nav' | 'header' | 'footer' | 'form';

interface ContainerProps extends PropsWithChildren {
	className?: string;
	as?: SemanticElement;
	role?: string;
}

/**
 * The single horizontal rhythm for the app: header, footer and page content all
 * share this width and gutter so their left/right edges line up on every
 * breakpoint. Pages that roll their own wrapper must use the same
 * `max-w-7xl px-4 sm:px-6 lg:px-8`.
 *
 * Note for callers: `cn` runs tailwind-merge, so passing a shorthand like `p-4`
 * silently replaces these gutters and knocks the element out of alignment — pass
 * `py-*` instead.
 */
const Container = ({ children = null, className = '', as: Component = 'div', role }: ContainerProps) => {
	if (!children) return null;

	return (
		<Component className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', className)} role={role}>
			{children}
		</Component>
	);
};

export default Container;
