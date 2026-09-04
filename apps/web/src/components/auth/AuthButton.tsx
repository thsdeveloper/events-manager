'use client';

import { Loader2 } from 'lucide-react';
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
			aria-busy={isLoading || undefined}
			style={{
				background: `linear-gradient(to right, ${accentColor}, ${accentColor}dd)`,
				boxShadow: `0 10px 25px -5px ${accentColor}33`,
			}}
			className="relative w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 text-white rounded-lg font-semibold hover:opacity-90 focus:ring-4 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
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
			{isLoading && (
				<span className="absolute inset-0 flex items-center justify-center">
					<Loader2 aria-hidden="true" className="size-5 animate-spin" />
				</span>
			)}
			{/* Hidden rather than unmounted so the button keeps its height while
			    the request is in flight. */}
			<span className={`inline-flex items-center gap-2 ${isLoading ? 'invisible' : ''}`}>{children}</span>
		</button>
	);
}
