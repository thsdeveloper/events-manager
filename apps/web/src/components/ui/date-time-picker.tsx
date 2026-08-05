'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

interface DateTimePickerProps {
	date?: Date;
	setDate: (date: Date | undefined) => void;
	placeholder?: string;
	disabled?: boolean;
	minDate?: Date;
	className?: string;
}

export function DateTimePicker({ date, setDate, placeholder, disabled, minDate, className }: DateTimePickerProps) {
	const [isOpen, setIsOpen] = React.useState(false);
	const [timeValue, setTimeValue] = React.useState<string>(date ? format(date, 'HH:mm') : '00:00');

	const handleDateSelect = (selectedDate: Date | undefined) => {
		if (!selectedDate) {
			setDate(undefined);
			
return;
		}

		// Preserve the time when selecting a new date
		const [hours, minutes] = timeValue.split(':').map(Number);
		const newDate = new Date(selectedDate);
		newDate.setHours(hours, minutes, 0, 0);
		setDate(newDate);
	};

	const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const newTime = event.target.value;
		setTimeValue(newTime);

		if (!date) return;

		const [hours, minutes] = newTime.split(':').map(Number);
		const newDate = new Date(date);
		newDate.setHours(hours, minutes, 0, 0);
		setDate(newDate);
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					disabled={disabled}
					className={cn(
						'w-full justify-start text-left font-normal',
						!date && 'text-muted-foreground',
						className,
					)}
				>
					<CalendarIcon className="mr-2 size-4" />
					{date ? (
						format(date, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
					) : (
						<span>{placeholder || 'Selecione data e hora'}</span>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<Calendar
					mode="single"
					selected={date}
					onSelect={handleDateSelect}
					disabled={(date) => {
						if (minDate && date < minDate) {
							return true;
						}
						
return false;
					}}
					initialFocus
				/>
				<div className="border-t p-3">
					<div className="flex items-center gap-2">
						<Clock className="size-4 text-muted-foreground" />
						<Input
							type="time"
							value={timeValue}
							onChange={handleTimeChange}
							className="w-full"
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}
