import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FormSectionProps {
	title: string;
	icon?: LucideIcon | string;
	children: ReactNode;
	description?: string;
	className?: string;
	required?: boolean;
}

export function FormSection({
	title,
	icon: Icon,
	children,
	description,
	className,
	required = false,
}: FormSectionProps) {
	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center gap-3">
					{typeof Icon === 'string' ? (
						<span className="text-2xl">{Icon}</span>
					) : Icon ? (
						<Icon className="size-5 text-primary" />
					) : null}
					<div className="space-y-1.5">
						<CardTitle role="heading" aria-level={2} className="flex items-center gap-2 text-lg">
							{title}
							{required && <Badge variant="secondary">Obrigatório</Badge>}
						</CardTitle>
						{description && <CardDescription>{description}</CardDescription>}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">{children}</CardContent>
		</Card>
	);
}
