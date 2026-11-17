'use client';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

interface DraftSnapshot {
	id: string;
	values: Record<string, unknown>;
	current_step: number;
	date_updated?: string;
	event_id?: string | null;
}
export function EventDraftList({
	enabled,
	resumePath = '/admin/eventos/novo',
}: {
	enabled: boolean;
	resumePath?: string;
}) {
	const [drafts, setDrafts] = useState<DraftSnapshot[]>([]);
	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const load = useCallback(async () => {
		setBusy(true);
		setError(null);
		try {
			const response = await fetch('/api/event-drafts', { credentials: 'include' });
			const body = await response.json().catch(() => null);
			if (!response.ok) throw new Error(body?.detail ?? 'Não foi possível carregar os rascunhos.');
			setDrafts((body?.data ?? []).filter((draft: DraftSnapshot) => !draft.event_id));
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os rascunhos.');
		} finally {
			setBusy(false);
		}
	}, []);
	useEffect(() => {
		if (enabled) void load();
	}, [enabled, load]);
	if (!enabled) return null;
	if (error)
		return (
			<Card role="region" aria-label="Rascunhos salvos" className="p-4">
				<Alert role="alert">
					<AlertDescription>{error}</AlertDescription>
				</Alert>
				<Button type="button" variant="outline" onClick={() => void load()}>
					Carregar rascunhos novamente
				</Button>
			</Card>
		);
	if (!drafts.length)
		return busy ? (
			<p role="status" className="text-sm text-muted-foreground">
				Carregando rascunhos da conta...
			</p>
		) : null;

	return (
		<Card role="region" aria-labelledby="event-draft-heading" className="p-5">
			<h2 id="event-draft-heading" className="text-lg font-semibold">
				Rascunhos salvos na conta
			</h2>
			<p className="mt-1 text-sm text-muted-foreground">Continue a criação sem publicar o evento.</p>
			<ul className="mt-4 space-y-3">
				{drafts.map((draft) => (
					<li key={draft.id}>
						<Card className="flex flex-wrap items-center justify-between gap-3 p-3">
							<div>
								<p className="font-medium">
									{typeof draft.values.title === 'string' && draft.values.title.trim()
										? draft.values.title
										: 'Evento sem título'}
								</p>
								<p className="text-xs text-muted-foreground">Etapa {draft.current_step + 1} de 7</p>
							</div>
							<Link
								className="text-sm font-medium underline underline-offset-4"
								href={resumePath + '?rascunho=' + encodeURIComponent(draft.id)}
							>
								Retomar rascunho
							</Link>
						</Card>
					</li>
				))}
			</ul>
		</Card>
	);
}
