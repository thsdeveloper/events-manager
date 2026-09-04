'use client';

import * as React from 'react';
import { Input } from '@/components/ui/input';
import { isValidCPF, isValidDocument, isValidPhone, maskCPF, maskDocument, maskPhone, onlyDigits } from '@/lib/br-documents';
import { cn } from '@/lib/utils';

type BaseProps = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
	/** Raw digits, matching how the value is stored. */
	value: string;
	/** Receives raw digits, never the mask. */
	onChange: (digits: string) => void;
	/** Renders the validation message once the field has been touched. */
	showError?: boolean;
};

function useMaskedField(
	value: string,
	onChange: (digits: string) => void,
	mask: (value: string) => string,
	maxDigits: number,
) {
	const [touched, setTouched] = React.useState(false);
	const handleChange = React.useCallback(
		(event: React.ChangeEvent<HTMLInputElement>) => onChange(onlyDigits(event.target.value).slice(0, maxDigits)),
		[maxDigits, onChange],
	);

	return { display: mask(value), touched, setTouched, handleChange };
}

/** Phone field: masks as (11) 91234-5678 and reports digits upward. */
export const PhoneInput = React.forwardRef<HTMLInputElement, BaseProps>(function PhoneInput(
	{ value, onChange, showError = true, className, ...props },
	ref,
) {
	const { display, touched, setTouched, handleChange } = useMaskedField(value, onChange, maskPhone, 11);
	const invalid = touched && value.length > 0 && !isValidPhone(value);

	return (
		<div className="space-y-1">
			<Input
				{...props}
				ref={ref}
				type="tel"
				inputMode="numeric"
				autoComplete="tel"
				value={display}
				onChange={handleChange}
				onBlur={event => {
					setTouched(true);
					props.onBlur?.(event);
				}}
				aria-invalid={invalid || undefined}
				placeholder={props.placeholder ?? '(11) 91234-5678'}
				className={cn(invalid && 'border-destructive focus-visible:ring-destructive', className)}
			/>
			{showError && invalid && (
				<p className="text-xs text-destructive" role="alert">
					Informe um telefone válido com DDD.
				</p>
			)}
		</div>
	);
});

/** Single field for CPF or CNPJ; the mask follows what is being typed. */
export const DocumentInput = React.forwardRef<HTMLInputElement, BaseProps>(function DocumentInput(
	{ value, onChange, showError = true, className, ...props },
	ref,
) {
	const { display, touched, setTouched, handleChange } = useMaskedField(value, onChange, maskDocument, 14);
	const invalid = touched && value.length > 0 && !isValidDocument(value);

	return (
		<div className="space-y-1">
			<Input
				{...props}
				ref={ref}
				inputMode="numeric"
				value={display}
				onChange={handleChange}
				onBlur={event => {
					setTouched(true);
					props.onBlur?.(event);
				}}
				aria-invalid={invalid || undefined}
				placeholder={props.placeholder ?? '000.000.000-00'}
				className={cn(invalid && 'border-destructive focus-visible:ring-destructive', className)}
			/>
			{showError && invalid && (
				<p className="text-xs text-destructive" role="alert">
					{value.length > 11 ? 'CNPJ inválido.' : 'CPF inválido.'}
				</p>
			)}
		</div>
	);
});

/** CPF only (never a CNPJ): masks as 000.000.000-00 and reports digits upward. */
export const CpfInput = React.forwardRef<HTMLInputElement, BaseProps>(function CpfInput(
	{ value, onChange, showError = true, className, ...props },
	ref,
) {
	const { display, touched, setTouched, handleChange } = useMaskedField(value, onChange, maskCPF, 11);
	const invalid = touched && value.length > 0 && !isValidCPF(value);

	return (
		<div className="space-y-1">
			<Input
				{...props}
				ref={ref}
				inputMode="numeric"
				value={display}
				onChange={handleChange}
				onBlur={event => {
					setTouched(true);
					props.onBlur?.(event);
				}}
				aria-invalid={invalid || undefined}
				placeholder={props.placeholder ?? '000.000.000-00'}
				className={cn(invalid && 'border-destructive focus-visible:ring-destructive', className)}
			/>
			{showError && invalid && (
				<p className="text-xs text-destructive" role="alert">
					CPF inválido.
				</p>
			)}
		</div>
	);
});
