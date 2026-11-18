'use client';
import { forwardRef } from 'react';
import { Input } from './input';
type Props = Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type'> & {
	value: number | string | null | undefined;
	onValueChange: (value: number) => void;
};
export const CurrencyInput = forwardRef<HTMLInputElement, Props>(function CurrencyInput(
	{ value, onValueChange, ...props },
	ref,
) {
	const amount = Number(value);
	const display =
		value === '' || value == null
			? ''
			: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
					.format(Number.isFinite(amount) ? amount : 0)
					.replace(/\u00a0/g, ' ');

	return (
		<Input
			{...props}
			ref={ref}
			type="text"
			inputMode="numeric"
			value={display}
			onChange={(event) => {
				const digits = event.target.value.replace(/\D/g, '').slice(0, 14);
				onValueChange(Number(digits || 0) / 100);
			}}
		/>
	);
});
