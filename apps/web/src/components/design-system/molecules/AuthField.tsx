import type { InputHTMLAttributes, ReactNode } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export function AuthField({
	endAction,
	hint,
	icon,
	id,
	label,
	className,
	...input
}: InputHTMLAttributes<HTMLInputElement> & {
	endAction?: ReactNode;
	hint?: string;
	icon: ReactNode;
	label?: string;
}) {
	return (
		<div className="space-y-2">
			{label ? <Label htmlFor={id}>{label}</Label> : null}
			<div className="relative">
				<span
					aria-hidden="true"
					className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-muted-foreground"
				>
					{icon}
				</span>
				<Input id={id} className={cn('h-12 rounded-xl pl-11', endAction && 'pr-12', className)} {...input} />
				{endAction ? <span className="absolute inset-y-0 right-0 flex items-center pr-2">{endAction}</span> : null}
			</div>
			{hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
		</div>
	);
}
