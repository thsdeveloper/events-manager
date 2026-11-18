'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { useToast } from '@/hooks/use-toast';
import { consumeEventCreation } from '../lib/creation-feedback';

const colors = ['#743DF5', '#FFD09D', '#B695F9', '#231A33', '#E1D4FC'];
export function EventCreatedFeedback({ eventId }: { eventId: string }) {
	const { toast } = useToast();
	const [celebrating, setCelebrating] = useState(false);
	useEffect(() => {
		const announce = window.setTimeout(() => {
			const receipt = consumeEventCreation(eventId);
			if (!receipt) return;
			const created = receipt.status === 'published' || receipt.status === 'draft';
			toast({
				title: created ? 'Evento criado!' : 'Evento existente recuperado',
				description:
					receipt.status === 'published'
						? 'Seu evento está no ar. Que tal compartilhar agora?'
						: receipt.status === 'draft'
							? 'Seu evento foi salvo como rascunho. Publique quando estiver pronto.'
							: 'Revise o estado atual do evento no painel.',
				variant: 'success',
			});
			if (created && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) setCelebrating(true);
		}, 0);

		return () => window.clearTimeout(announce);
	}, [eventId, toast]);
	useEffect(() => {
		if (!celebrating) return;
		const timer = window.setTimeout(() => setCelebrating(false), 7000);

		return () => window.clearTimeout(timer);
	}, [celebrating]);
	if (!celebrating) return null;

	return (
		<div
			data-event-celebration
			aria-hidden="true"
			className="pointer-events-none fixed inset-0 z-[100] overflow-hidden motion-reduce:hidden"
		>
			{Array.from({ length: 64 }, (_, i) => (
				<span
					key={i}
					className="event-creation-confetti"
					style={
						{
							left: `${(i * 37) % 100}%`,
							backgroundColor: colors[i % colors.length],
							animationDelay: `${(i % 9) * 90}ms`,
							animationDuration: `${4 + (i % 5) * 0.4}s`,
							'--confetti-drift': `${(i % 2 ? 1 : -1) * (40 + (i % 100))}px`,
							borderRadius: i % 3 === 0 ? '50%' : '2px',
						} as CSSProperties
					}
				/>
			))}
		</div>
	);
}
