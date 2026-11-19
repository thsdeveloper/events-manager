'use client';

import { useEffect, useRef, useState } from 'react';

export interface EventSectionLink {
	id: string;
	label: string;
}

/** A altura real das duas barras também determina o espaço livre nas âncoras. */
export function EventSectionNavigation({ links }: { links: EventSectionLink[] }) {
	const navigationRef = useRef<HTMLElement>(null);
	const [selected, setSelected] = useState('');

	useEffect(() => {
		const updateSelection = () => setSelected(window.location.hash.slice(1));
		updateSelection();
		window.addEventListener('hashchange', updateSelection);

		return () => window.removeEventListener('hashchange', updateSelection);
	}, []);

	useEffect(() => {
		const navigation = navigationRef.current;
		const page = navigation?.closest('main');
		const header = document.querySelector<HTMLElement>('[data-site-header]');
		if (!navigation || !page || !header) return;

		const measure = () => {
			page.style.setProperty('--event-header-height', `${header.getBoundingClientRect().height}px`);
			page.style.setProperty('--event-navigation-height', `${navigation.getBoundingClientRect().height}px`);
		};
		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(header);
		observer.observe(navigation);

		return () => {
			observer.disconnect();
			page.style.removeProperty('--event-header-height');
			page.style.removeProperty('--event-navigation-height');
		};
	}, []);

	return (
		<nav
			ref={navigationRef}
			aria-label="Explore o evento"
			className="sticky top-[var(--event-header-height,5rem)] z-30 flex flex-wrap gap-x-6 gap-y-1 border-y border-[#743DF5]/10 bg-[#FBF9FF]/95 py-2 shadow-sm backdrop-blur-md dark:bg-background/95"
		>
			{links.map((link) => (
				<a
					key={link.id}
					href={`#${link.id}`}
					aria-current={selected === link.id ? 'location' : undefined}
					className="inline-flex min-h-11 items-center text-sm font-semibold text-muted-foreground hover:text-[#743DF5] aria-[current=location]:text-[#743DF5] focus-visible:rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#743DF5]"
				>
					{link.label}
				</a>
			))}
		</nav>
	);
}
