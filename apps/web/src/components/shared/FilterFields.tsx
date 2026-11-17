'use client';

import { useId, type ComponentProps } from 'react';
import { format, isValid, parseISO } from 'date-fns';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOption<T extends string = string> {
	value: T;
	label: string;
}
const EMPTY = '__empty_filter__';

export function FilterInput({ label, ...props }: ComponentProps<typeof Input> & { label: string }) {
	const id = useId();

	return (
		<div className="space-y-2">
			<Label htmlFor={props.id ?? id}>{label}</Label>
			<Input {...props} id={props.id ?? id} />
		</div>
	);
}

export function FilterSelect<T extends string>({
	label,
	value,
	onChange,
	options,
}: {
	label: string;
	value: T;
	onChange: (value: T) => void;
	options: readonly FilterOption<T>[];
}) {
	const id = useId();

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<Select value={value || EMPTY} onValueChange={(next) => onChange((next === EMPTY ? '' : next) as T)}>
				<SelectTrigger id={id}>
					<SelectValue />
				</SelectTrigger>
				<SelectContent>
					{options.map((option) => (
						<SelectItem key={option.value} value={option.value || EMPTY}>
							{option.label}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
}

export function FilterCheckboxGroup<T extends string>({
	label,
	values,
	onChange,
	options,
}: {
	label: string;
	values: T[];
	onChange: (values: T[]) => void;
	options: readonly FilterOption<T>[];
}) {
	const id = useId();

	return (
		<fieldset className="space-y-3">
			<legend className="text-sm font-medium">{label}</legend>
			{options.map((option, index) => (
				<div key={option.value} className="flex items-center gap-2">
					<Checkbox
						id={`${id}-${index}`}
						checked={values.includes(option.value)}
						onCheckedChange={(checked) =>
							onChange(checked === true ? [...values, option.value] : values.filter((value) => value !== option.value))
						}
					/>
					<Label htmlFor={`${id}-${index}`} className="font-normal">
						{option.label}
					</Label>
				</div>
			))}
		</fieldset>
	);
}

/** ISO values at the filter boundary; the calendar works in local time. */
export function FilterDate({
	label,
	value,
	onChange,
}: {
	label: string;
	value: string;
	onChange: (value: string) => void;
}) {
	const id = useId();
	const date = value ? parseISO(value) : undefined;

	return (
		<div className="space-y-2">
			<Label htmlFor={id}>{label}</Label>
			<DatePicker
				id={id}
				date={date && isValid(date) ? date : undefined}
				onSelect={(selected) => onChange(selected ? format(selected, 'yyyy-MM-dd') : '')}
			/>
		</div>
	);
}
