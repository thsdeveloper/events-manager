'use client';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
export const RichTextEditor = dynamic(() => import('./RichTextEditor').then((module) => module.RichTextEditor), {
	loading: () => (
		<div role="status" aria-label="Carregando editor">
			<Skeleton className="h-64 w-full" />
		</div>
	),
});
