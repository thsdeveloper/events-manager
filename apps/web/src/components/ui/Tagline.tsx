import { cn } from '@/lib/utils';

interface TitleProps {
	tagline?: string | null;
	className?: string;
	as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

const Tagline = ({ tagline, className = '', as: Component = 'h2' }: TitleProps) => {
	if (!tagline) return null;

	return (
		<Component
			className={cn('font-heading text-link font-medium uppercase tracking-widest text-xs sm:text-xs', className)}
		>
			{tagline}
		</Component>
	);
};

export default Tagline;
