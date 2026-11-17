'use client';

import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';

interface ProgressBarProps {
	progress: number;
	sections: Array<{
		label: string;
		completed: boolean;
	}>;
}

export function ProgressBar({ progress, sections }: ProgressBarProps) {
	return (
		<Card className="bg-card  rounded-lg border border-border  p-4 shadow-sm">
			<div className="flex items-center justify-between mb-3">
				<div>
					<h3 className="text-sm font-semibold text-foreground ">Progresso do Formulário</h3>
					<p className="text-xs text-muted-foreground  mt-0.5">
						{sections.filter((s) => s.completed).length} de {sections.length} seções completas
					</p>
				</div>
				<div className="text-right">
					<div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{Math.round(progress)}%</div>
					<p className="text-xs text-muted-foreground ">completo</p>
				</div>
			</div>

			{/* Progress Bar */}
			<Progress value={progress} aria-label="Progresso do formulário" className="mb-4 h-2" />

			{/* Section Checklist */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
				{sections.map((section, index) => (
					<motion.div
						key={index}
						initial={{ opacity: 0, x: -10 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ delay: index * 0.05 }}
						className="flex items-center gap-2 text-xs"
					>
						{section.completed ? (
							<CheckCircle2 className="size-4 text-green-600 dark:text-green-400 flex-shrink-0" />
						) : (
							<Circle className="size-4 text-gray-300 dark:text-muted-foreground flex-shrink-0" />
						)}
						<span className={section.completed ? 'text-foreground  font-medium' : 'text-muted-foreground '}>
							{section.label}
						</span>
					</motion.div>
				))}
			</div>
		</Card>
	);
}
