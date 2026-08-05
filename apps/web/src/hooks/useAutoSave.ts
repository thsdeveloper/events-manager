'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AutoSaveOptions {
	delay?: number;
	onSave: (data: any) => Promise<void>;
	enabled?: boolean;
}

export function useAutoSave<T extends Record<string, any>>(
	data: T,
	options: AutoSaveOptions
) {
	const { delay = 30000, onSave, enabled = true } = options;
	const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
	const lastDataRef = useRef<string | undefined>(undefined);

	const save = useCallback(async () => {
		if (!enabled) return;

		const currentData = JSON.stringify(data);

		// Don't save if data hasn't changed
		if (currentData === lastDataRef.current) {
			return;
		}

		setStatus('saving');

		try {
			await onSave(data);
			setStatus('saved');
			setLastSaved(new Date());
			lastDataRef.current = currentData;

			// Reset to idle after showing "saved" for 3 seconds
			setTimeout(() => {
				setStatus('idle');
			}, 3000);
		} catch (error) {
			console.error('Auto-save failed:', error);
			setStatus('error');

			// Reset to idle after showing error for 5 seconds
			setTimeout(() => {
				setStatus('idle');
			}, 5000);
		}
	}, [data, onSave, enabled]);

	// Auto-save effect
	useEffect(() => {
		if (!enabled) return;

		// Clear existing timeout
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}

		// Set new timeout
		timeoutRef.current = setTimeout(() => {
			save();
		}, delay);

		// Cleanup
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, [data, delay, save, enabled]);

	// Manual save function
	const saveNow = useCallback(async () => {
		if (timeoutRef.current) {
			clearTimeout(timeoutRef.current);
		}
		await save();
	}, [save]);

	return {
		status,
		lastSaved,
		saveNow,
	};
}
