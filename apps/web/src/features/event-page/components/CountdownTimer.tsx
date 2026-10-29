'use client';

import { useEffect, useState } from 'react';

interface Remaining {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
}

function remainingUntil(target: number, now: number): Remaining | null {
	const diff = Math.max(target - now, 0);
	if (diff === 0) return null;
	const seconds = Math.floor(diff / 1000);

	return {
		days: Math.floor(seconds / 86_400),
		hours: Math.floor((seconds % 86_400) / 3600),
		minutes: Math.floor((seconds % 3600) / 60),
		seconds: seconds % 60,
	};
}

/**
 * Contagem regressiva até o início do evento. Só começa a contar depois de
 * montar no navegador: o servidor não sabe a hora do visitante, e um número
 * diferente no HTML e no cliente quebraria a hidratação.
 */
export function CountdownTimer({ target }: { target: string }) {
	const [remaining, setRemaining] = useState<Remaining | null | undefined>(undefined);

	useEffect(() => {
		const end = new Date(target).getTime();
		const tick = () => setRemaining(remainingUntil(end, Date.now()));
		tick();
		const timer = window.setInterval(tick, 1000);

		return () => window.clearInterval(timer);
	}, [target]);

	if (remaining === null) {
		return <p className="text-lg font-semibold">O evento já começou.</p>;
	}

	const cells: Array<[string, number | undefined]> = [
		['dias', remaining?.days],
		['horas', remaining?.hours],
		['min', remaining?.minutes],
		['seg', remaining?.seconds],
	];

	return (
		<div className="flex flex-wrap justify-center gap-3 sm:gap-5" role="timer" aria-live="off">
			{cells.map(([label, value]) => (
				<div
					key={label}
					className="flex min-w-[4.5rem] flex-col items-center rounded-xl border border-current/10 bg-black/5 p-3 dark:bg-white/10"
				>
					<span className="text-3xl font-bold tabular-nums sm:text-4xl">
						{value === undefined ? '--' : String(value).padStart(2, '0')}
					</span>
					<span className="text-xs uppercase tracking-wide opacity-70">{label}</span>
				</div>
			))}
		</div>
	);
}
