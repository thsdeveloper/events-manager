'use client';

import * as React from 'react';
import { format, isValid, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ISO = 'yyyy-MM-dd';
const DISPLAY = 'dd/MM/yyyy';

function parseIso(value: string | undefined) {
	if (!value) return undefined;
	const date = parse(value, ISO, new Date());

	return isValid(date) ? date : undefined;
}

/** Progressive dd/mm/aaaa mask over the digits typed so far. */
function maskDigits(digits: string) {
	const d = digits.slice(0, 8);
	if (d.length <= 2) return d;
	if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;

	return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/** ISO for a complete, real calendar date; '' for anything else. */
function displayToIso(display: string) {
	if (display.length !== DISPLAY.length) return '';
	const date = parse(display, DISPLAY, new Date());

	return isValid(date) ? format(date, ISO) : '';
}

function isoToDisplay(value: string) {
	const date = parseIso(value);

	return date ? format(date, DISPLAY) : '';
}

export interface DateInputProps
	extends Omit<React.ComponentProps<typeof Input>, 'value' | 'onChange' | 'type' | 'min' | 'max'> {
	/** ISO date (AAAA-MM-DD) or '' when empty or incomplete. */
	value: string;
	/** Receives the ISO date once the typed value is a real date, or '' otherwise. */
	onChange: (value: string) => void;
	/** ISO bounds; the calendar refuses days outside them. */
	min?: string;
	max?: string;
}

/**
 * Date field that is typed first and picked second. Dates such as a birth date
 * sit decades away from today, so the keyboard (dd/mm/aaaa, digits only) is the
 * fastest path; the calendar opens with month and year selectors, positioned at
 * the latest allowed year instead of today, for whoever prefers to browse.
 *
 * The value contract stays ISO (`AAAA-MM-DD`), the same the API and the schemas
 * use, so the mask is presentation only.
 */
export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(function DateInput(
	{ value, onChange, min, max, className, disabled, ...props },
	ref,
) {
	const [display, setDisplay] = React.useState(() => isoToDisplay(value));
	const [open, setOpen] = React.useState(false);

	// Follow the parent when it changes the value (reset, data loaded later),
	// without fighting the user while a date is still being typed.
	React.useEffect(() => {
		setDisplay((current) => (displayToIso(current) === value ? current : isoToDisplay(value)));
	}, [value]);

	const selected = parseIso(value);
	const minDate = parseIso(min);
	const maxDate = parseIso(max);
	const today = new Date();
	const startMonth = minDate ?? new Date(today.getFullYear() - 120, 0, 1);
	const endMonth = maxDate ?? today;

	const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const next = maskDigits(event.target.value.replace(/\D/g, ''));
		setDisplay(next);
		onChange(displayToIso(next));
	};

	return (
		<div className="relative">
			<Input
				{...props}
				ref={ref}
				type="text"
				inputMode="numeric"
				autoComplete={props.autoComplete ?? 'bday'}
				placeholder={props.placeholder ?? 'dd/mm/aaaa'}
				value={display}
				onChange={handleChange}
				disabled={disabled}
				maxLength={DISPLAY.length}
				className={cn('pr-11', className)}
			/>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						type="button"
						variant="ghost"
						size="icon"
						disabled={disabled}
						aria-label="Abrir calendário"
						className="absolute inset-y-0 right-1 my-auto size-9 rounded-md text-muted-foreground hover:text-foreground"
					>
						<CalendarIcon className="size-4" />
					</Button>
				</PopoverTrigger>
				<PopoverContent align="end" className="w-auto p-0">
					<Calendar
						mode="single"
						captionLayout="dropdown"
						locale={ptBR}
						selected={selected}
						defaultMonth={selected ?? endMonth}
						startMonth={startMonth}
						endMonth={endMonth}
						disabled={[...(maxDate ? [{ after: maxDate }] : []), ...(minDate ? [{ before: minDate }] : [])]}
						labels={{ labelMonthDropdown: () => 'Mês', labelYearDropdown: () => 'Ano' }}
						formatters={{ formatMonthDropdown: (date) => format(date, 'MMMM', { locale: ptBR }) }}
						onSelect={(date) => {
							if (!date) return;
							const iso = format(date, ISO);
							setDisplay(format(date, DISPLAY));
							onChange(iso);
							setOpen(false);
						}}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
});
