'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2, Cloud, CloudOff } from 'lucide-react';

interface AutoSaveIndicatorProps {
	status: 'idle' | 'saving' | 'saved' | 'error';
	lastSaved?: Date | null;
}

export function AutoSaveIndicator({ status, lastSaved }: AutoSaveIndicatorProps) {
	const getTimeAgo = (date: Date) => {
		const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

		if (seconds < 60) return `há ${seconds}s`;
		const minutes = Math.floor(seconds / 60);
		if (minutes < 60) return `há ${minutes}min`;
		const hours = Math.floor(minutes / 60);

		return `há ${hours}h`;
	};

	return (
		<AnimatePresence mode="wait">
			<motion.div
				key={status}
				initial={{ opacity: 0, scale: 0.9 }}
				animate={{ opacity: 1, scale: 1 }}
				exit={{ opacity: 0, scale: 0.9 }}
				className="flex items-center gap-2 text-sm"
			>
				{status === 'saving' && (
					<>
						<Loader2 className="size-4 animate-spin text-blue-600 dark:text-blue-400" />
						<span className="text-blue-600 dark:text-blue-400 font-medium">
							Salvando...
						</span>
					</>
				)}

				{status === 'saved' && (
					<>
						<Check className="size-4 text-green-600 dark:text-green-400" />
						<span className="text-green-600 dark:text-green-400 font-medium">
							Salvo {lastSaved && getTimeAgo(lastSaved)}
						</span>
					</>
				)}

				{status === 'error' && (
					<>
						<CloudOff className="size-4 text-red-600 dark:text-red-400" />
						<span className="text-red-600 dark:text-red-400 font-medium">
							Erro ao salvar
						</span>
					</>
				)}

				{status === 'idle' && (
					<>
						<Cloud className="size-4 text-gray-400 dark:text-gray-500" />
						<span className="text-gray-500 dark:text-gray-400">
							{lastSaved ? `Salvo ${getTimeAgo(lastSaved)}` : 'Não salvo'}
						</span>
					</>
				)}
			</motion.div>
		</AnimatePresence>
	);
}
