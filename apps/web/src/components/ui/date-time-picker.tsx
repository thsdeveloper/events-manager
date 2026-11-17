'use client';
import * as React from 'react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DateTimePickerProps extends Omit<React.ComponentPropsWithoutRef<typeof Button>, 'children'> {
	date?: Date;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
	minDate?: Date;
	clearable?: boolean;
}
export const DateTimePicker = React.forwardRef<HTMLButtonElement, DateTimePickerProps>(function DateTimePicker(
	{ date, setDate, placeholder, disabled, minDate, clearable = false, className, ...props },
	ref,
) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [pendingTime, setPendingTime] = React.useState('00:00');
	const timeId = React.useId();
	const timeValue = date ? format(date, 'HH:mm') : pendingTime;
	const updateTime = (value: string) => {
		setPendingTime(value);
		if (!date || !/^\d{2}:\d{2}$/.test(value)) return;
		const [hours, minutes] = value.split(':').map(Number);
		const next = new Date(date);
		next.setHours(hours, minutes, 0, 0);
		setDate(next);
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					{...props}
					ref={ref}
					type="button"
					variant="outline"
					disabled={disabled}
					className={cn('w-full justify-start text-left font-normal', !date && 'text-muted-foreground', className)}
				>
					<CalendarIcon className="mr-2 size-4" aria-hidden="true" />
					{date ? format(date, 'dd/MM/yyyy HH:mm', { locale: ptBR }) : placeholder || 'Selecione data e hora'}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					locale={ptBR}
					defaultMonth={date ?? minDate}
					selected={date}
					onSelect={(selected) => {
						if (!selected) {
							setDate(undefined);

							return;
						}
						const [hours, minutes] = (timeValue || '00:00').split(':').map(Number);
						const next = new Date(selected);
						next.setHours(hours, minutes, 0, 0);
						setDate(minDate && next < minDate ? new Date(minDate) : next);
					}}
					disabled={minDate ? { before: startOfDay(minDate) } : undefined}
					autoFocus
				/>
				<div className="space-y-3 border-t p-3">
					<Label htmlFor={timeId} className="flex items-center gap-2">
						<Clock className="size-4" aria-hidden="true" />
						Horário
					</Label>
					<Input id={timeId} type="time" value={timeValue} onChange={(event) => updateTime(event.target.value)} />
					{clearable && date && (
						<Button
							type="button"
							variant="ghost"
							className="w-full"
							onClick={() => {
								setDate(undefined);
								setPendingTime('00:00');
								setIsOpen(false);
							}}
						>
							Limpar data
						</Button>
					)}
					<Button type="button" className="w-full" onClick={() => setIsOpen(false)}>
						Concluir
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
});
