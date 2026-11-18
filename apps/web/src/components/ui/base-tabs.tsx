'use client';
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs';
import { cn } from '@/lib/utils';
// Shadcn Base UI composition, kept separate from the existing Radix consumers.
export const Tabs = TabsPrimitive.Root;
export function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
	return (
		<TabsPrimitive.List
			{...props}
			className={cn('inline-flex items-center gap-1 rounded-xl bg-muted p-1 text-muted-foreground', className)}
		/>
	);
}
export function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
	return (
		<TabsPrimitive.Tab
			{...props}
			className={cn(
				'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-medium transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-not-allowed aria-disabled:opacity-40 data-[active]:bg-background data-[active]:text-foreground data-[active]:shadow-sm',
				className,
			)}
		/>
	);
}
export function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
	return (
		<TabsPrimitive.Panel
			{...props}
			className={cn('outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
		/>
	);
}
