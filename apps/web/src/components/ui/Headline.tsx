import { cn } from '@/lib/utils';

interface HeadlineProps {
	headline?: string | null;
	className?: string;
	as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
}

const Headline = ({ headline, className = '', as: Component = 'p' }: HeadlineProps) => {
	if (!headline) return null;

	return (
		<Component
			className={cn(
				'break-words font-heading font-semibold tracking-tight text-foreground',
				Component === 'h1'
					? 'text-3xl md:text-4xl'
					: Component === 'h2'
						? 'text-2xl md:text-3xl'
						: 'text-xl md:text-2xl',
				'leading-tight',
				className,
			)}
		>
			{headline}
		</Component>
	);
};

export default Headline;
