'use client';

import { Button } from '@/components/ui/button';
import { memo } from 'react';
import { Check } from 'lucide-react';
import { resolveCategoryIcon } from '@/features/categories/icons';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface CategoryCardProps {
	id: string;
	name: string;
	description?: string | null;
	icon?: string | null;
	color?: string | null;
	isSelected: boolean;
	onSelect: (id: string) => void;
}

export const CategoryCard = memo(function CategoryCard({
	id,
	name,
	description,
	icon,
	isSelected,
	onSelect,
}: CategoryCardProps) {
	const handleClick = () => {
		onSelect(id);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			onSelect(id);
		}
	};

	const Icon = resolveCategoryIcon(icon);
	const cardContent = (
		<Button
			variant={isSelected ? 'secondary' : 'outline'}
			type="button"
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className="h-auto w-full justify-start gap-3 whitespace-normal py-4 text-left"
			aria-pressed={isSelected}
			aria-label={`Selecionar categoria ${name}`}
		>
			<Icon className="size-4 text-muted-foreground" />
			<span className="flex-1">{name}</span>
			{isSelected && <Check className="size-4" />}
		</Button>
	);

	// Only wrap with tooltip if there's a description
	if (!description) {
		return cardContent;
	}

	return (
		<TooltipProvider delayDuration={300}>
			<Tooltip>
				<TooltipTrigger asChild>{cardContent}</TooltipTrigger>
				<TooltipContent side="top" className="max-w-[280px]">
					<p className="text-sm">{description}</p>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
});
