'use client';

import { useEffect, useState } from 'react';

export function useGlobals() {
	const [globals, setGlobals] = useState<any>(null);

	useEffect(() => {
		const element = document.querySelector('[data-globals]');
		if (element) {
			try {
				const data = JSON.parse(element.getAttribute('data-globals') || '{}');
				setGlobals(data);
			} catch (error) {
				console.error('Error parsing globals data:', error);
			}
		}
	}, []);

	return globals;
}
