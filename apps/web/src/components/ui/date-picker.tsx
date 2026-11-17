'use client';

import * as React from 'react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface DatePickerProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'onSelect' | 'children'> {
	date?: Date;
	onSelect?: (date: Date | undefined) => void;
	placeholder?: string;
	minDate?: Date;
	maxDate?: Date;
	clearable?: boolean;
}

/** Shadcn Date Picker: Button + Popover + Calendar, preserving local calendar dates. */
export const DatePicker = React.forwardRef<HTMLButtonElement, DatePickerProps>(function DatePicker(
	{
		date,
		onSelect,
		placeholder = 'Selecione uma data',
		disabled,
		className,
		minDate,
		maxDate,
		clearable = true,
		...props
	},
	ref,
) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					{...props}
					ref={ref}
					type="button"
					variant="outline"
					disabled={disabled}
					className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground', className)}
				>
					<CalendarIcon className="size-4 shrink-0" aria-hidden="true" />
					{date ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : placeholder}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					locale={ptBR}
					selected={date}
					defaultMonth={date ?? minDate ?? maxDate}
					onSelect={(selected) => {
						onSelect?.(selected);
						setOpen(false);
					}}
					disabled={[
						...(minDate ? [{ before: startOfDay(minDate) }] : []),
						...(maxDate ? [{ after: startOfDay(maxDate) }] : []),
					]}
					autoFocus
				/>
				{clearable && date && (
					<div className="border-t p-3">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							className="w-full"
							onClick={() => {
								onSelect?.(undefined);
								setOpen(false);
							}}
						>
							Limpar data
						</Button>
					</div>
				)}
			</PopoverContent>
		</Popover>
	);
});
