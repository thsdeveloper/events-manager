'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

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
		<motion.div
			initial={{ opacity: 0, y: 20 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.3 }}
			className={cn(
				'bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 space-y-4 shadow-sm hover:shadow-md transition-shadow duration-200',
				className
			)}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-3">
					{typeof Icon === 'string' ? (
						<span className="text-2xl">{Icon}</span>
					) : Icon ? (
						<div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
							<Icon className="size-5 text-purple-600 dark:text-purple-400" />
						</div>
					) : null}
					<div>
						<h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
							{title}
							{required && (
								<span className="text-xs font-normal text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded-full">
									Obrigatório
								</span>
							)}
						</h2>
						{description && (
							<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
								{description}
							</p>
						)}
					</div>
				</div>
			</div>
			<div className="space-y-4">{children}</div>
		</motion.div>
	);
}
