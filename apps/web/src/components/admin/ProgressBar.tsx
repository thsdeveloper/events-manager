'use client';

import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
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
		<Card className="p-4">
			<div className="flex items-center justify-between mb-3">
				<div>
					<h3 className="text-sm font-semibold text-foreground">Progresso do Formulário</h3>
					<p className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
						{sections.filter((s) => s.completed).length} de {sections.length} seções completas
					</p>
				</div>
				<div className="text-right">
					<div className="text-2xl font-bold text-primary">{Math.round(progress)}%</div>
					<p className="text-xs text-muted-foreground dark:text-muted-foreground">completo</p>
				</div>
			</div>

			{/* Progress Bar */}
			<Progress value={progress} aria-label="Progresso do formulário" className="mb-4 h-2" />

			{/* Section Checklist */}
			<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
				{sections.map((section, index) => (
					<div key={index} className="flex items-center gap-2 text-xs">
						{section.completed ? (
							<CheckCircle2 className="size-4 text-muted-foreground  flex-shrink-0" />
						) : (
							<Circle className="size-4 text-muted-foreground dark:text-muted-foreground flex-shrink-0" />
						)}
						<span
							className={
								section.completed ? 'text-foreground font-medium' : 'text-muted-foreground dark:text-muted-foreground'
							}
						>
							{section.label}
						</span>
					</div>
				))}
			</div>
		</Card>
	);
}
