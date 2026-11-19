'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { eventPageLayoutSchema, type Event, type EventPageRecord } from '@events-manager/contracts';
import { revalidateEventPage } from '../actions';
import { layoutToPuckData, puckDataToLayout } from '../puck/data';
import type { EventPageData } from '../puck/types';
import { createPageWriter } from './page-writer';

export function usePageDraft(
	event: Event,
	initialPage: EventPageRecord,
	canEdit: boolean,
	canPublish: boolean,
	delay: number,
) {
	const initialData = useMemo(() => layoutToPuckData(initialPage.draft), [initialPage]);
	const [data, setData] = useState(initialData);
	const latest = useRef(data);
	const [record, setRecord] = useState(initialPage);
	const [savedKey, setSavedKey] = useState(JSON.stringify(initialData));
	const [busy, setBusy] = useState<'save' | 'publish' | 'unpublish' | null>(null);
	const [error, setError] = useState<string[]>([]);
	const [notice, setNotice] = useState('');
	const writer = useMemo(() => createPageWriter(event.id, initialPage), [event.id, initialPage]);
	const layout = useMemo(() => puckDataToLayout(data), [data]);
	const validation = useMemo(() => eventPageLayoutSchema.safeParse(layout), [layout]);
	const dirty = JSON.stringify(data) !== savedKey;
	const change = useCallback((next: EventPageData) => {
		latest.current = next;
		setData(next);
		setError([]);
		setNotice('');
	}, []);
	const save = useCallback(
		async (snapshot = latest.current) => {
			if (!canEdit) return;
			setBusy('save');
			setError([]);
			try {
				const saved = await writer.save(puckDataToLayout(snapshot));
				setRecord(saved);
				setSavedKey(JSON.stringify(snapshot));
				setNotice('Rascunho salvo');
			} catch (cause) {
				setError([cause instanceof Error ? cause.message : 'Não foi possível salvar o rascunho.']);
			} finally {
				setBusy(null);
			}
		},
		[canEdit, writer],
	);
	useEffect(() => {
		if (!dirty || !canEdit || busy || !validation.success || error.length) return;
		const timer = window.setTimeout(() => void save(), delay);

		return () => window.clearTimeout(timer);
	}, [data, dirty, canEdit, busy, validation.success, error.length, save, delay]);
	useEffect(() => {
		if (!dirty) return;
		const warn = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			e.returnValue = '';
		};
		window.addEventListener('beforeunload', warn);

		return () => window.removeEventListener('beforeunload', warn);
	}, [dirty]);
	const publish = useCallback(
		async (snapshot: EventPageData) => {
			if (!canPublish) return;
			setBusy('publish');
			setError([]);
			try {
				const saved = await writer.publish(puckDataToLayout(snapshot));
				setRecord(saved);
				setSavedKey(JSON.stringify(snapshot));
				setNotice('Página publicada');
				if (event.slug)
					await revalidateEventPage(event.slug).catch(() =>
						setNotice('Página publicada. A atualização do cache será refeita no próximo acesso.'),
					);
			} catch (cause) {
				const issues = (cause as { problem?: { context?: { issues?: Array<{ message: string }> } } }).problem?.context
					?.issues;
				setError(
					issues?.length
						? issues.map((issue) => issue.message)
						: [cause instanceof Error ? cause.message : 'Não foi possível publicar.'],
				);
			} finally {
				setBusy(null);
			}
		},
		[canPublish, event.slug, writer],
	);
	const unpublish = useCallback(async () => {
		if (!canPublish) return;
		setBusy('unpublish');
		setError([]);
		try {
			setRecord(await writer.unpublish());
			setNotice('Layout padrão restaurado');
			if (event.slug)
				await revalidateEventPage(event.slug).catch(() =>
					setNotice('Layout padrão restaurado. Atualize a página pública para conferir.'),
				);

			return true;
		} catch (cause) {
			setError([cause instanceof Error ? cause.message : 'Não foi possível voltar ao padrão.']);

			return false;
		} finally {
			setBusy(null);
		}
	}, [canPublish, event.slug, writer]);

	return {
		initialData,
		data,
		latest,
		layout,
		record,
		dirty,
		busy,
		error,
		notice,
		validation,
		change,
		save,
		publish,
		unpublish,
	};
}
