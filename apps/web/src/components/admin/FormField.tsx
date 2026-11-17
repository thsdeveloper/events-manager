'use client';

import { Spinner } from '@/components/ui/spinner';
import { Label } from '@/components/ui/label';
import { ReactNode } from 'react';
import { Check, X, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
	label: string;
	name: string;
	required?: boolean;
	error?: string;
	hint?: string;
	maxLength?: number;
	value?: string;
	onChange?: (value: string) => void;
	onBlur?: () => void;
	validationState?: 'idle' | 'validating' | 'valid' | 'error';
	children: ReactNode;
	showCounter?: boolean;
}

export function FormField({
	label,
	name,
	required = false,
	error,
	hint,
	maxLength,
	value = '',
	onChange,
	onBlur,
	validationState = 'idle',
	children,
	showCounter = false,
}: FormFieldProps) {
	const characterCount = value?.length || 0;
	const isNearLimit = maxLength && characterCount / maxLength > 0.8;

	return (
		<div className="space-y-2">
			{/* Label */}
			<div className="flex items-center justify-between">
				<Label htmlFor={name} className="block text-sm font-medium text-foreground">
					{label}
					{required && <span className="text-primary ml-1">*</span>}
				</Label>

				{/* Validation Status Icon */}
				{validationState !== 'idle' && (
					<div className="flex items-center gap-1">
						{validationState === 'validating' && (
							<Spinner aria-label="Validando campo" className="size-4 text-primary" />
						)}
						{validationState === 'valid' && <Check className="size-4 text-muted-foreground " />}
						{validationState === 'error' && <X className="size-4 text-destructive " />}
					</div>
				)}
			</div>

			{/* Input wrapper with border indication */}
			<div className="relative" onBlur={onBlur}>
				{children}
			</div>

			{/* Counter, Hint, and Error Messages */}
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 space-y-1">
					{/* Hint */}
					{hint && !error && (
						<div className="flex items-start gap-1.5 text-xs text-muted-foreground dark:text-muted-foreground">
							<Info className="size-3.5 mt-0.5 flex-shrink-0" />
							<span>{hint}</span>
						</div>
					)}

					{/* Error Message */}
					{error && (
						<div className="flex items-start gap-1.5 text-xs text-destructive ">
							<AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
							<span className="font-medium">{error}</span>
						</div>
					)}

					{/* SEO Warning for short descriptions */}
					{name === 'short_description' && maxLength && characterCount < 50 && characterCount > 0 && !error && (
						<div className="flex items-start gap-1.5 text-xs text-muted-foreground ">
							<AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
							<span>Adicione mais {50 - characterCount} caracteres (mín. 50 para SEO)</span>
						</div>
					)}
				</div>

				{/* Character Counter */}
				{showCounter && maxLength && (
					<div
						className={cn(
							'text-xs font-medium tabular-nums',
							isNearLimit ? 'text-muted-foreground ' : 'text-muted-foreground dark:text-muted-foreground',
						)}
					>
						{characterCount}/{maxLength}
					</div>
				)}
			</div>
		</div>
	);
}
