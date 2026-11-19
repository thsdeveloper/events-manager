'use client';

import { useEffect, useState, type CSSProperties } from 'react';

const colors = ['#743DF5', '#FFD09D', '#B695F9', '#231A33', '#F3EEFF'];
export function PurchaseCelebration({ purchaseId }: { purchaseId: string }) {
	const [active, setActive] = useState(false);
	useEffect(() => {
		const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
		if (preference.matches) return;
		setActive(true);
		const timer = window.setTimeout(() => setActive(false), 6500);
		const stop = () => {
			if (preference.matches) setActive(false);
		};
		preference.addEventListener('change', stop);

		return () => {
			window.clearTimeout(timer);
			preference.removeEventListener('change', stop);
		};
	}, [purchaseId]);
	if (!active) return null;

	return (
		<div
			data-purchase-celebration
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 z-[100] overflow-hidden motion-reduce:hidden"
		>
			{Array.from({ length: 64 }, (_, i) => (
				<span
					key={i}
					className="purchase-confetti"
					style={
						{
							left: `${(i * 37) % 100}%`,
							backgroundColor: colors[i % colors.length],
							animationDelay: `${(i % 11) * 100}ms`,
							animationDuration: `${3.5 + (i % 5) * 0.35}s`,
							'--confetti-drift': `${(i % 2 ? 1 : -1) * (35 + ((i * 13) % 110))}px`,
							borderRadius: i % 3 === 0 ? '50%' : '2px',
						} as CSSProperties
					}
				/>
			))}
		</div>
	);
}
