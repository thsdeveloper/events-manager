'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useServerAuth } from '@/hooks/useServerAuth';

/**
 * ProtectedRoute component - Client-side protection wrapper
 *
 * Note: Most authentication is now handled by middleware (src/middleware.ts)
 * which redirects unauthorized users before they reach components.
 * This component provides additional client-side protection for edge cases.
 */
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
	const { user, isLoading } = useServerAuth();
	const router = useRouter();

	useEffect(() => {
		if (!isLoading && !user) {
			router.push('/login');
		}
	}, [user, isLoading, router]);

	if (isLoading) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="animate-spin rounded-full size-8 border-b-2 border-gray-900"></div>
			</div>
		);
	}

	if (!user) {
		return null;
	}

	return <>{children}</>;
}
