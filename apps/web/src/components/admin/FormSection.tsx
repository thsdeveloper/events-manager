'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

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
						<span aria-hidden="true" className="text-2xl">
							{Icon}
						</span>
					) : Icon ? (
						<Icon aria-hidden="true" className="size-5 text-primary" />
					) : null}
					<div className="space-y-1">
						<CardTitle className="text-lg">
							<h2 className="flex items-center gap-2">
								{title}
								{required && <Badge variant="secondary">Obrigatório</Badge>}
							</h2>
						</CardTitle>
						{description && <CardDescription>{description}</CardDescription>}
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">{children}</CardContent>
		</Card>
	);
}
