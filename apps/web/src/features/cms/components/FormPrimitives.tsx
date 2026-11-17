'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

export function FieldError({ message, id }: { message?: string | null; id?: string }) {
	if (!message) return null;

	return (
		<p id={id} className="text-xs text-red-600" role="alert">
			{message}
		</p>
	);
}

export function CharCounter({ value, max }: { value: string | null | undefined; max: number }) {
	const length = value?.length ?? 0;

	return (
		<span className={cn('text-xs tabular-nums', length >= max ? 'text-amber-600' : 'text-muted-foreground')}>
			{length}/{max}
		</span>
	);
}

interface FieldProps {
	id: string;
	label: string;
	hint?: string;
	error?: string | null;
	counter?: { value: string | null | undefined; max: number };
	children: ReactNode;
	className?: string;
}

/** Rótulo + controle + ajuda + erro, no padrão dos formulários do painel. */
export function Field({ id, label, hint, error, counter, children, className }: FieldProps) {
	return (
		<div className={cn('space-y-1.5', className)}>
			<div className="flex items-center justify-between gap-2">
				<Label htmlFor={id}>{label}</Label>
				{counter && <CharCounter value={counter.value} max={counter.max} />}
			</div>
			{children}
			{hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
			<FieldError message={error} id={`${id}-error`} />
		</div>
	);
}

export function SectionCard({
	title,
	description,
	children,
	actions,
	className,
}: {
	title: string;
	description?: string;
	children: ReactNode;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<Card className={cn('rounded-lg border border-border bg-card shadow-sm', className)}>
			<CardHeader className="flex-row items-start justify-between gap-4 space-y-0 border-b px-5 py-4">
				<div>
					<CardTitle className="text-base">
						<h2>{title}</h2>
					</CardTitle>
					{description && <CardDescription className="mt-0.5">{description}</CardDescription>}
				</div>
				{actions}
			</CardHeader>
			<CardContent className="space-y-5 p-5">{children}</CardContent>
		</Card>
	);
}
