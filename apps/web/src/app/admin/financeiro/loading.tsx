'use client';

export default function Loading() {
	return (
		<div className="space-y-6 animate-pulse">
			<div className="h-12 w-64 rounded-xl bg-gray-200 dark:bg-gray-800" />
			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{Array.from({ length: 6 }).map((_, index) => (
					<div
						key={index}
						className="h-32 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900"
					/>
				))}
			</div>
			<div className="h-96 rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-slate-900" />
		</div>
	);
}
