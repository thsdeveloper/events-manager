'use client';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import type { ReactNode } from 'react';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function FieldError({ message, id }: { message?: string | null; id?: string }) {
	if (!message) return null;

	return (
		<Alert variant="destructive" id={id} className="text-xs" role="alert">
			<AlertDescription>{message}</AlertDescription>
		</Alert>
	);
}

export function CharCounter({ value, max }: { value: string | null | undefined; max: number }) {
	const length = value?.length ?? 0;

	return (
		<span className={cn('text-xs tabular-nums', length >= max ? 'text-muted-foreground' : 'text-muted-foreground')}>
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
		<Card className={cn('', className)}>
			<CardHeader className="flex-row items-start justify-between gap-4 border-b px-5 py-4">
				<div>
					<CardTitle role="heading" aria-level={2} className="text-base">
						{title}
					</CardTitle>
					{description && <CardDescription>{description}</CardDescription>}
				</div>
				{actions}
			</CardHeader>
			<CardContent className="space-y-5 p-5">{children}</CardContent>
		</Card>
	);
}
