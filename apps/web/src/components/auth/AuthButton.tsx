'use client';

import { useGlobals } from '@/hooks/useGlobals';
import { ButtonHTMLAttributes, ReactNode } from 'react';

interface AuthButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
	children: ReactNode;
	isLoading?: boolean;
}

export function AuthButton({ children, isLoading, disabled, ...props }: AuthButtonProps) {
	const globals = useGlobals();
	const accentColor = globals?.accent_color || '#6644ff';

	return (
		<button
			disabled={isLoading || disabled}
			style={{
				background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
				boxShadow: `0 10px 25px -5px ${accentColor}33`,
			}}
			className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-white rounded-xl font-semibold hover:opacity-90 focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
			onMouseEnter={(e) => {
				if (!isLoading && !disabled) {
					e.currentTarget.style.boxShadow = `0 20px 35px -5px ${accentColor}4d`;
				}
			}}
			onMouseLeave={(e) => {
				e.currentTarget.style.boxShadow = `0 10px 25px -5px ${accentColor}33`;
			}}
			{...props}
		>
			{children}
		</button>
	);
}
