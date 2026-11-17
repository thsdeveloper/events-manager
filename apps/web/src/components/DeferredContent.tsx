'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Defer interactive content until it is near the viewport; keep it mounted once loaded. */
export function DeferredContent({ children, fallback }: { children: ReactNode; fallback: ReactNode }) {
	const ref = useRef<HTMLDivElement>(null);
	const [visible, setVisible] = useState(false);
	useEffect(() => {
		if (typeof IntersectionObserver === 'undefined') {
			setVisible(true);

			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting)) {
					setVisible(true);
					observer.disconnect();
				}
			},
			{ rootMargin: '200px' },
		);
		if (ref.current) observer.observe(ref.current);

		return () => observer.disconnect();
	}, []);

	return (
		<div ref={ref} className="min-w-0">
			{visible ? children : fallback}
		</div>
	);
}
