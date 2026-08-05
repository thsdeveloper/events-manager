'use client';

import { ReactNode, useState, useEffect } from 'react';
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
	const [focused, setFocused] = useState(false);
	const characterCount = value?.length || 0;
	const isNearLimit = maxLength && characterCount / maxLength > 0.8;

	return (
		<div className="space-y-2">
			{/* Label */}
			<div className="flex items-center justify-between">
				<label
					htmlFor={name}
					className="block text-sm font-medium text-gray-700 dark:text-gray-300"
				>
					{label}
					{required && (
						<span className="text-purple-600 dark:text-purple-400 ml-1">*</span>
					)}
				</label>

				{/* Validation Status Icon */}
				{validationState !== 'idle' && (
					<div className="flex items-center gap-1">
						{validationState === 'validating' && (
							<div className="size-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
						)}
						{validationState === 'valid' && (
							<Check className="size-4 text-green-600 dark:text-green-400" />
						)}
						{validationState === 'error' && (
							<X className="size-4 text-red-600 dark:text-red-400" />
						)}
					</div>
				)}
			</div>

			{/* Input wrapper with border indication */}
			<div
				className={cn(
					'relative rounded-lg transition-all duration-200',
					focused && 'ring-2 ring-purple-500/20',
					required && !error && !value && 'border-l-4 border-l-purple-500',
					error && 'border-l-4 border-l-red-500',
					validationState === 'valid' && 'border-l-4 border-l-green-500'
				)}
				onFocus={() => setFocused(true)}
				onBlur={() => {
					setFocused(false);
					onBlur?.();
				}}
			>
				{children}
			</div>

			{/* Counter, Hint, and Error Messages */}
			<div className="flex items-start justify-between gap-2">
				<div className="flex-1 space-y-1">
					{/* Hint */}
					{hint && !error && (
						<div className="flex items-start gap-1.5 text-xs text-gray-500 dark:text-gray-400">
							<Info className="size-3.5 mt-0.5 flex-shrink-0" />
							<span>{hint}</span>
						</div>
					)}

					{/* Error Message */}
					{error && (
						<div className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
							<AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
							<span className="font-medium">{error}</span>
						</div>
					)}

					{/* SEO Warning for short descriptions */}
					{name === 'short_description' &&
						maxLength &&
						characterCount < 50 &&
						characterCount > 0 &&
						!error && (
							<div className="flex items-start gap-1.5 text-xs text-amber-600 dark:text-amber-400">
								<AlertCircle className="size-3.5 mt-0.5 flex-shrink-0" />
								<span>
									Adicione mais {50 - characterCount} caracteres (mín. 50 para SEO)
								</span>
							</div>
						)}
				</div>

				{/* Character Counter */}
				{showCounter && maxLength && (
					<div
						className={cn(
							'text-xs font-medium tabular-nums',
							isNearLimit
								? 'text-amber-600 dark:text-amber-400'
								: 'text-gray-500 dark:text-gray-400'
						)}
					>
						{characterCount}/{maxLength}
					</div>
				)}
			</div>
		</div>
	);
}
