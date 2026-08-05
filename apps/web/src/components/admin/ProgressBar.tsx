'use client';

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
		<div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
			<div className="flex items-center justify-between mb-3">
				<div>
					<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
						Progresso do Formulário
					</h3>
					<p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
						{sections.filter(s => s.completed).length} de {sections.length} seções completas
					</p>
				</div>
				<div className="text-right">
					<div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
						{Math.round(progress)}%
					</div>
					<p className="text-xs text-gray-500 dark:text-gray-400">
						completo
					</p>
				</div>
			</div>

			{/* Progress Bar */}
			<div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
				<motion.div
					initial={{ width: 0 }}
					animate={{ width: `${progress}%` }}
					transition={{ duration: 0.5, ease: 'easeOut' }}
					className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
				/>
			</div>

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
							<Circle className="size-4 text-gray-300 dark:text-gray-600 flex-shrink-0" />
						)}
						<span className={section.completed ? 'text-gray-900 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}>
							{section.label}
						</span>
					</motion.div>
				))}
			</div>
		</div>
	);
}
