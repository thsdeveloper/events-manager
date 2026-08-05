'use client';

import { memo } from 'react';
import {
	Check,
	Palette,
	GraduationCap,
	Dumbbell,
	Church,
	Music,
	Briefcase,
	Laptop,
	Sparkles,
	type LucideIcon
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CategoryCardProps {
	id: string;
	name: string;
	description?: string | null;
	icon?: string | null;
	color?: string | null;
	isSelected: boolean;
	onSelect: (id: string) => void;
}

/**
 * Map of icon names to their Lucide React components.
 */
const iconMap: Record<string, LucideIcon> = {
	'palette': Palette,
	'graduation-cap': GraduationCap,
	'dumbbell': Dumbbell,
	'church': Church,
	'music': Music,
	'briefcase': Briefcase,
	'laptop': Laptop,
};

/**
 * Dynamically renders a Lucide icon based on the icon name string.
 * Falls back to a default icon if the icon is not found.
 */
function DynamicLucideIcon({ iconName, className, color }: { iconName?: string | null; className?: string; color?: string | null }) {
	const IconComponent = iconName ? iconMap[iconName.toLowerCase()] : null;
	const FallbackIcon = IconComponent || Sparkles;

	return <FallbackIcon className={className} style={{ color: color || undefined }} />;
}

/**
 * CategoryCard component with compact single-line design.
 *
 * Features:
 * - Single-line layout with icon and name
 * - Tooltip showing description on hover
 * - Dynamic Lucide icon rendering
 * - Color-coded visual feedback
 * - Smooth animations and transitions
 * - Accessible keyboard navigation
 * - Optimized with React.memo for performance
 */
export const CategoryCard = memo(function CategoryCard({
	id,
	name,
	description,
	icon,
	color,
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

	const cardContent = (
		<button
			type="button"
			onClick={handleClick}
			onKeyDown={handleKeyDown}
			className={cn(
				'group relative flex w-full items-center gap-3 rounded-lg border-2 px-4 py-3 text-left transition-all duration-200',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
				'hover:shadow-md active:scale-[0.98]',
				isSelected
					? 'bg-primary/10 shadow-sm'
					: 'border-border bg-card hover:bg-accent/50',
			)}
			style={{
				borderColor: isSelected && color ? color : undefined,
				'--category-color': color || 'hsl(var(--primary))',
			} as React.CSSProperties}
			onMouseEnter={(e) => {
				if (!isSelected && color) {
					e.currentTarget.style.borderColor = `${color}80`;
				}
			}}
			onMouseLeave={(e) => {
				if (!isSelected) {
					e.currentTarget.style.borderColor = '';
				}
			}}
			aria-pressed={isSelected}
			aria-label={`Selecionar categoria ${name}`}
		>
			{/* Icon Container */}
			<div
				className={cn(
					'flex size-10 shrink-0 items-center justify-center rounded-lg transition-all duration-200',
					isSelected ? 'bg-primary/20 shadow-sm' : 'bg-accent group-hover:bg-primary/10',
				)}
				style={{
					backgroundColor: isSelected && color ? `${color}20` : undefined,
				}}
			>
				<DynamicLucideIcon
					iconName={icon}
					className={cn(
						'size-5 transition-all duration-200',
						isSelected ? 'scale-110' : 'group-hover:scale-105'
					)}
					color={isSelected && color ? color : undefined}
				/>
			</div>

			{/* Name */}
			<span
				className={cn(
					'flex-1 font-medium transition-colors duration-200',
					isSelected ? 'text-primary' : 'text-foreground group-hover:text-primary',
				)}
				style={{
					color: isSelected && color ? color : undefined,
				}}
			>
				{name}
			</span>

			{/* Check Mark */}
			{isSelected && (
				<div
					className="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm animate-in zoom-in-50 duration-200"
					style={{
						backgroundColor: color || undefined,
					}}
				>
					<Check className="size-3.5" strokeWidth={3} />
				</div>
			)}

			{/* Bottom indicator */}
			<div
				className={cn(
					'absolute inset-x-0 bottom-0 h-0.5 rounded-b-lg transition-all duration-200',
					isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-50',
				)}
				style={{
					backgroundColor: color || 'hsl(var(--primary))',
				}}
			/>
		</button>
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
