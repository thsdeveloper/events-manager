import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LandingContext } from './landing-context';

/** Link de âncora que, na pré-visualização do construtor, não navega. */
export function AnchorLink({
	anchor,
	children,
	className,
	mode,
}: {
	anchor: string;
	children: ReactNode;
	className?: string;
	mode: LandingContext['mode'];
}) {
	if (mode === 'preview') {
		return (
			<button type="button" className={className}>
				{children}
			</button>
		);
	}

	return (
		<a href={`#${anchor}`} className={className}>
			{children}
		</a>
	);
}

const buttonClass =
	'inline-flex items-center justify-center rounded-lg px-5 py-3 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2';

/** Botão principal na cor de destaque: rola até os ingressos ou vai ao checkout. */
export function AccentButton({
	children,
	className,
	context,
	href,
	target = 'tickets',
}: {
	children: ReactNode;
	className?: string;
	context: LandingContext;
	href?: string;
	target?: 'tickets' | 'checkout' | 'url';
}) {
	const classes = cn(buttonClass, className);
	const style = { backgroundColor: 'var(--landing-accent)' };

	if (context.mode === 'preview') {
		return (
			<button type="button" className={classes} style={style}>
				{children}
			</button>
		);
	}
	if (target === 'checkout') {
		return (
			<Link href={context.checkoutHref} className={classes} style={style}>
				{children}
			</Link>
		);
	}
	if (target === 'url' && href) {
		return (
			<a href={href} target="_blank" rel="noopener noreferrer" className={classes} style={style}>
				{children}
			</a>
		);
	}

	return (
		<a
			href={context.ticketsAnchor ? `#${context.ticketsAnchor}` : context.checkoutHref}
			className={classes}
			style={style}
		>
			{children}
		</a>
	);
}

export function SectionShell({
	anchor,
	children,
	className,
	title,
	subtitle,
}: {
	anchor: string;
	children: ReactNode;
	className?: string;
	title?: string;
	subtitle?: string;
}) {
	return (
		<section id={anchor} className={cn('scroll-mt-20 py-14 sm:py-20', className)}>
			<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
				{title ? (
					<div className="mb-8 max-w-2xl">
						<h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
						{subtitle ? <p className="mt-2 text-base opacity-80">{subtitle}</p> : null}
					</div>
				) : null}
				{children}
			</div>
		</section>
	);
}
