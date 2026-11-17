'use client';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
	buildEventPageSection,
	validateEventPageLayout,
	type Event,
	type EventPageIssue,
	type EventPageLayout,
	type EventPageRecord,
	type EventPageSection,
	type EventPageSectionType,
} from '@events-manager/contracts';
import { ExternalLink, Monitor, Plus, Smartphone } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { revalidateEventPage } from '@/features/event-page/actions';
import { EventLandingPage } from '@/features/event-page/components/EventLandingPage';
import { useToast } from '@/hooks/use-toast';
import { describeProblem } from '@/lib/problem';
import { cn } from '@/lib/utils';
import { AddSectionDialog } from './AddSectionDialog';
import { HeaderThemeCard } from './HeaderThemeCard';
import { describePageStatus, duplicateSection, isProtectedSection, layoutsEqual, moveSection } from './lib';
import { PublishIssues } from './PublishIssues';
import { SectionList } from './SectionList';
import { SectionSheet } from './SectionSheet';

interface EventPageBuilderProps {
	event: Event;
	initialPage: EventPageRecord;
	/** Espera depois da última mudança antes de salvar o rascunho sozinho. */
	autosaveDelayMs?: number;
}

const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const time = new Intl.DateTimeFormat('pt-BR', { timeStyle: 'short' });

async function pageRequest(eventId: string, path: string, init: RequestInit) {
	const response = await fetch(`/api/events/${eventId}/page${path}`, { credentials: 'include', ...init });
	const body = await response.json().catch(() => null);
	if (!response.ok) throw Object.assign(new Error(describeProblem(body)), { problem: body });

	return body as EventPageRecord;
}

/**
 * Construtor da página do evento: seções ordenáveis à esquerda, prévia ao vivo
 * à direita. O rascunho salva sozinho pouco depois de cada mudança; publicar é
 * um ato explícito, e só passa com um layout coerente.
 */
export function EventPageBuilder({ event, initialPage, autosaveDelayMs = 1500 }: EventPageBuilderProps) {
	const { toast } = useToast();
	const [record, setRecord] = useState(initialPage);
	const [draft, setDraft] = useState<EventPageLayout>(initialPage.draft);
	const [savedDraft, setSavedDraft] = useState<EventPageLayout>(initialPage.draft);
	const [saving, setSaving] = useState(false);
	const [savedAt, setSavedAt] = useState<Date | null>(null);
	const [publishing, setPublishing] = useState(false);
	const [issues, setIssues] = useState<EventPageIssue[]>([]);
	const [pickerOpen, setPickerOpen] = useState(false);
	const [editing, setEditing] = useState<EventPageSection | null>(null);
	const [toRemove, setToRemove] = useState<EventPageSection | null>(null);
	const [confirmUnpublish, setConfirmUnpublish] = useState(false);
	const [viewport, setViewport] = useState<'desktop' | 'mobile'>('desktop');
	const draftRef = useRef(draft);
	draftRef.current = draft;
	const savingRef = useRef(false);

	const dirty = !layoutsEqual(draft, savedDraft);
	const status = describePageStatus({ ...record, draft });

	const saveDraft = useCallback(async () => {
		if (savingRef.current) return;
		const snapshot = draftRef.current;
		savingRef.current = true;
		setSaving(true);
		try {
			const saved = await pageRequest(event.id, '', {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ draft: snapshot }),
			});
			setRecord((current) => ({ ...current, ...saved, draft: snapshot }));
			setSavedDraft(snapshot);
			setSavedAt(new Date());
		} catch (error) {
			toast({
				title: 'Não foi possível salvar o rascunho',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			savingRef.current = false;
			setSaving(false);
		}
	}, [event.id, toast]);

	// Salvamento automático: espera a pessoa parar de mexer e nunca sobrepõe um
	// salvamento em andamento (o próximo ciclo pega o que ficou).
	useEffect(() => {
		if (!dirty) return;
		const timer = window.setTimeout(() => {
			if (!savingRef.current) void saveDraft();
		}, autosaveDelayMs);

		return () => window.clearTimeout(timer);
	}, [autosaveDelayMs, dirty, draft, saveDraft]);

	const updateSections = (sections: EventPageSection[]) => setDraft((current) => ({ ...current, sections }));

	const addSection = (type: EventPageSectionType) => {
		const section = buildEventPageSection(
			type,
			draft.sections.map((item) => item.anchor),
		);
		updateSections([...draft.sections, section]);
		setPickerOpen(false);
	};

	const applySection = (section: EventPageSection) => {
		updateSections(draft.sections.map((item) => (item.id === section.id ? section : item)));
		setEditing(null);
	};

	const publish = async () => {
		const local = validateEventPageLayout(draft);
		setIssues(local);
		if (local.length > 0) return;
		setPublishing(true);
		try {
			if (dirty) await saveDraft();
			const published = await pageRequest(event.id, '/publish', { method: 'POST' });
			setRecord(published);
			setSavedDraft(published.draft);
			// A página pública fica em cache; sem isto a publicação só apareceria depois.
			if (event.slug) await revalidateEventPage(event.slug);
			toast({
				title: 'Página publicada',
				description: 'Ela já substitui o layout padrão do evento.',
				variant: 'success',
			});
		} catch (error) {
			const problem = (error as { problem?: { context?: { issues?: EventPageIssue[] } } }).problem;
			const reported = problem?.context?.issues;
			if (Array.isArray(reported) && reported.length > 0) setIssues(reported);
			else
				toast({
					title: 'Não foi possível publicar',
					description: error instanceof Error ? error.message : 'Tente novamente.',
					variant: 'destructive',
				});
		} finally {
			setPublishing(false);
		}
	};

	const unpublish = async () => {
		try {
			const updated = await pageRequest(event.id, '/unpublish', { method: 'POST' });
			setRecord({ ...updated, draft });
			if (event.slug) await revalidateEventPage(event.slug);
			toast({ title: 'Layout padrão restaurado', description: 'A página do evento voltou ao modelo do site.' });
		} catch (error) {
			toast({
				title: 'Não foi possível voltar ao padrão',
				description: error instanceof Error ? error.message : 'Tente novamente.',
				variant: 'destructive',
			});
		} finally {
			setConfirmUnpublish(false);
		}
	};

	const statusLabel =
		status.kind === 'draft'
			? 'Rascunho'
			: status.kind === 'published'
				? `Publicada em ${dateTime.format(new Date(status.publishedAt))}`
				: `Alterações não publicadas (no ar desde ${dateTime.format(new Date(status.publishedAt))})`;

	return (
		<div className="space-y-6">
			<PageHeader
				title="Página do evento"
				description={
					<p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
						<Badge variant="secondary">{statusLabel}</Badge>
						<span aria-live="polite">
							{saving
								? 'Salvando…'
								: savedAt
									? `Salvo às ${time.format(savedAt)}`
									: dirty
										? 'Alterações pendentes'
										: null}
						</span>
					</p>
				}
				actions={
					<div role="toolbar" aria-label="Ações da página" className="flex flex-wrap items-center gap-2">
						{record.enabled && event.slug ? (
							<Button variant="outline" size="sm" asChild>
								<Link href={`/eventos/${event.slug}`} target="_blank">
									<ExternalLink className="mr-2 size-4" />
									Ver página
								</Link>
							</Button>
						) : null}
						{record.enabled ? (
							<Button variant="outline" size="sm" onClick={() => setConfirmUnpublish(true)}>
								Voltar ao padrão
							</Button>
						) : null}
						<Button variant="outline" size="sm" onClick={() => void saveDraft()} disabled={saving}>
							Salvar rascunho
						</Button>
						<Button size="sm" onClick={() => void publish()} loading={publishing}>
							{status.kind === 'changed' ? 'Publicar alterações' : 'Publicar'}
						</Button>
					</div>
				}
			/>

			<PublishIssues issues={issues} sections={draft.sections} />

			<div className="grid gap-6 xl:grid-cols-[minmax(0,460px)_minmax(0,1fr)]">
				<div className="space-y-6">
					<section className="space-y-3">
						<div className="flex items-center justify-between">
							<h2 className="text-sm font-semibold text-foreground">Seções</h2>
							<Button size="sm" onClick={() => setPickerOpen(true)}>
								<Plus className="mr-2 size-4" />
								Adicionar seção
							</Button>
						</div>
						<SectionList
							sections={draft.sections}
							onReorder={updateSections}
							onMove={(index, direction) => updateSections(moveSection(draft.sections, index, index + direction))}
							onEdit={setEditing}
							onToggleHidden={(section) =>
								!isProtectedSection(section) &&
								updateSections(
									draft.sections.map((item) => (item.id === section.id ? { ...item, hidden: !item.hidden } : item)),
								)
							}
							onDuplicate={(section) => {
								const index = draft.sections.findIndex((item) => item.id === section.id);
								const next = [...draft.sections];
								next.splice(index + 1, 0, duplicateSection(section, draft.sections));
								updateSections(next);
							}}
							onRemove={(section) => !isProtectedSection(section) && setToRemove(section)}
						/>
					</section>

					<HeaderThemeCard
						layout={draft}
						sections={draft.sections}
						onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
					/>
				</div>

				<section aria-label="Pré-visualização" className="space-y-3 xl:sticky xl:top-20 xl:self-start">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-semibold text-foreground">Pré-visualização</h2>
						<Card className="flex items-center gap-1 p-0.5">
							<Button
								size="sm"
								variant={viewport === 'desktop' ? 'secondary' : 'ghost'}
								aria-pressed={viewport === 'desktop'}
								onClick={() => setViewport('desktop')}
								aria-label="Ver como desktop"
							>
								<Monitor className="size-4" />
							</Button>
							<Button
								size="sm"
								variant={viewport === 'mobile' ? 'secondary' : 'ghost'}
								aria-pressed={viewport === 'mobile'}
								onClick={() => setViewport('mobile')}
								aria-label="Ver como celular"
							>
								<Smartphone className="size-4" />
							</Button>
						</Card>
					</div>
					<Card className="overflow-hidden p-3">
						<Card
							className={cn(
								'mx-auto max-h-[75vh] overflow-y-auto transition-[width]',
								viewport === 'mobile' ? 'w-[390px]' : 'w-full',
							)}
						>
							<EventLandingPage event={event} layout={draft} mode="preview" />
						</Card>
					</Card>
				</section>
			</div>

			<AddSectionDialog open={pickerOpen} sections={draft.sections} onPick={addSection} onOpenChange={setPickerOpen} />

			<SectionSheet
				section={editing}
				takenAnchors={draft.sections.filter((item) => item.id !== editing?.id).map((item) => item.anchor)}
				onApply={applySection}
				onClose={() => setEditing(null)}
			/>

			<AlertDialog open={Boolean(toRemove)} onOpenChange={(open) => !open && setToRemove(null)}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Remover seção</AlertDialogTitle>
						<AlertDialogDescription>
							A seção sai da página. Você pode adicioná-la de novo depois, mas o conteúdo dela não volta.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								if (toRemove) updateSections(draft.sections.filter((item) => item.id !== toRemove.id));
								setToRemove(null);
							}}
						>
							Remover seção
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			<AlertDialog open={confirmUnpublish} onOpenChange={setConfirmUnpublish}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Voltar ao layout padrão</AlertDialogTitle>
						<AlertDialogDescription>
							O público volta a ver a página padrão do site para este evento. Seu rascunho fica guardado e você pode
							publicar de novo quando quiser.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							onClick={(e) => {
								e.preventDefault();
								void unpublish();
							}}
						>
							Voltar ao layout padrão
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
