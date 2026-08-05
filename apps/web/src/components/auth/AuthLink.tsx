'use client';

import { useGlobals } from '@/hooks/useGlobals';
import Link from 'next/link';
import { AnchorHTMLAttributes, ReactNode } from 'react';

interface AuthLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
	href: string;
	children: ReactNode;
}

export function AuthLink({ href, children, className = '', ...props }: AuthLinkProps) {
	const globals = useGlobals();
	const accentColor = globals?.accent_color || '#6644ff';

	return (
		<Link
			href={href}
			className={`transition-colors hover:opacity-80 ${className}`}
			style={{ color: globals ? accentColor : '#6644ff' }}
			{...props}
		>
			{children}
		</Link>
	);
}
