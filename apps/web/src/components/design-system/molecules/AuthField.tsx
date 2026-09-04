import type { InputHTMLAttributes, ReactNode, Ref } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

/**
 * Adapts `register('field')` for `AuthField`, moving the callback ref onto the
 * `inputRef` prop so it reaches the real `<input>`.
 *
 * @example <AuthField id="email" {...registerField(register('email'))} />
 */
export function registerField({ ref, ...registration }: UseFormRegisterReturn) {
	return { ...registration, inputRef: ref };
}

export function AuthField({
	endAction,
	error,
	hint,
	icon,
	id,
	label,
	className,
	inputRef,
	...input
}: InputHTMLAttributes<HTMLInputElement> & {
	endAction?: ReactNode;
	/** Validation message for this field. Replaces `hint` while present. */
	error?: string;
	hint?: string;
	icon: ReactNode;
	/**
	 * Forwarded to the underlying `<input>`. Named explicitly instead of relying
	 * on `ref` so that spreading `react-hook-form`'s `register()` lands on the
	 * DOM node rather than on this wrapper.
	 */
	inputRef?: Ref<HTMLInputElement>;
	label?: string;
}) {
	const errorId = `${id}-error`;
	const hintId = `${id}-hint`;

	return (
		<div className="space-y-2">
			{label ? <Label htmlFor={id}>{label}</Label> : null}
			<div className="relative">
				<span
					aria-hidden="true"
					className={cn(
						'pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4',
						error ? 'text-destructive' : 'text-muted-foreground',
					)}
				>
					{icon}
				</span>
				<Input
					id={id}
					ref={inputRef}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? errorId : hint ? hintId : undefined}
					className={cn(
						'h-12 rounded-lg pl-11',
						endAction && 'pr-12',
						error && 'border-destructive focus-visible:ring-destructive',
						className,
					)}
					{...input}
				/>
				{endAction ? <span className="absolute inset-y-0 right-0 flex items-center pr-2">{endAction}</span> : null}
			</div>
			{/* The error takes the hint's place so the field never grows a second
			    line of helper text and shifts the form while typing. */}
			{error ? (
				<p id={errorId} role="alert" className="text-xs font-medium text-destructive">
					{error}
				</p>
			) : hint ? (
				<p id={hintId} className="text-xs text-muted-foreground">
					{hint}
				</p>
			) : null}
		</div>
	);
}
