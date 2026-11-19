'use client';
import { Puck, useGetPuck, type Overrides } from '@puckeditor/core';
import '@puckeditor/core/no-external.css';
import {
	createContext,
	useContext,
	useMemo,
	useState,
	useEffect,
	useRef,
	useCallback,
	type ComponentProps,
	type RefObject,
	type ReactNode,
} from 'react';
import Link from 'next/link';
import { ExternalLink, Save, Sparkles } from 'lucide-react';
import { usePermissions } from '@/components/auth/PermissionsProvider';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
import { usePageDraft } from '../api/usePageDraft';
import { createEditorConfig, eventFieldTransforms } from '../puck/editor-config';
import { eventEditorDictionary } from '../puck/dictionary';
import type { EventPageConfig, EventPageData } from '../puck/types';
import { describePageStatus } from './lib';
import { describePageFieldIssue } from '../puck/validation';
import type { EventPageBuilderProps } from './EventPageBuilder';
import styles from './editor.module.css';

type Actions = {
	puck: RefObject<ReturnType<typeof useGetPuck> | null>;
	canEdit: boolean;
	canPublish: boolean;
	busy: boolean;
	valid: boolean;
	save: (data: EventPageData) => Promise<void>;
	publish: (data: EventPageData) => Promise<void>;
};
const ActionsContext = createContext<Actions | null>(null);
function EditorActions() {
	const actions = useContext(ActionsContext)!;
	const getPuck = useGetPuck();
	useEffect(() => {
		actions.puck.current = getPuck;

		return () => {
			actions.puck.current = null;
		};
	}, [actions.puck, getPuck]);
	const snapshot = () => getPuck().appState.data as EventPageData;

	return (
		<div className="flex items-center gap-2">
			{actions.canEdit && (
				<Button
					size="sm"
					variant="outline"
					disabled={actions.busy || !actions.valid}
					onClick={() => void actions.save(snapshot())}
				>
					<Save className="mr-2 size-4" />
					Salvar rascunho
				</Button>
			)}
			{actions.canPublish && (
				<Button size="sm" disabled={actions.busy || !actions.valid} onClick={() => void actions.publish(snapshot())}>
					Publicar
				</Button>
			)}
		</div>
	);
}
/** The iframe inherits stylesheet rules; copy Next's font variables and theme classes as well. */
function PreviewFrame({ children, document: frame }: { children: ReactNode; document?: Document }) {
	useEffect(() => {
		if (!frame) return;
		frame.documentElement.lang = 'pt-BR';
		frame.documentElement.className = document.documentElement.className;
		frame.body.className = document.body.className;
	}, [frame]);

	return <>{children}</>;
}
const overrides: Partial<Overrides<EventPageConfig>> = { headerActions: EditorActions, iframe: PreviewFrame };
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
const viewports = [
	{ width: 1280, height: 'auto' as const, label: 'Computador', icon: 'Monitor' as const },
	{ width: 768, height: 'auto' as const, label: 'Tablet', icon: 'Tablet' as const },
	{ width: 390, height: 'auto' as const, label: 'Celular', icon: 'Smartphone' as const },
];
export function PuckEventPageEditor({ event, initialPage, autosaveDelayMs = 1500 }: EventPageBuilderProps) {
	const { can } = usePermissions();
	const canEdit = can('event_pages.update', event.id);
	const canPublish = can('event_pages.publish', event.id);
	const page = usePageDraft(event, initialPage, canEdit, canPublish, autosaveDelayMs);
	const [confirmUnpublish, setConfirmUnpublish] = useState(false);
	const puck = useRef<ReturnType<typeof useGetPuck> | null>(null);
	const onAction: NonNullable<ComponentProps<typeof Puck<EventPageConfig>>['onAction']> = useCallback(
		(action, state, previous) => {
			if (action.type !== 'duplicate') return;
			const before = new Set(previous.data.content.map((item) => item.props.id));
			const copies = state.data.content.filter((item) => !before.has(item.props.id));
			// Puck duplicates data without invoking resolveData; run its public resolver for new copies.
			queueMicrotask(() => {
				for (const copy of copies) puck.current?.().resolveDataById(copy.props.id, 'force');
			});
		},
		[],
	);
	const config = useMemo(
		() =>
			createEditorConfig(
				event,
				page.initialData,
				() => (puck.current?.().appState.data as EventPageData | undefined) ?? page.latest.current,
			),
		[event, page.initialData, page.latest],
	);
	const editable = canEdit && page.busy !== 'publish' && page.busy !== 'unpublish';
	const permissions = useMemo(
		() => ({ edit: editable, drag: editable, insert: editable, delete: editable, duplicate: editable }),
		[editable],
	);
	const actions: Actions = {
		puck,
		canEdit,
		canPublish,
		busy: Boolean(page.busy),
		valid: page.validation.success,
		save: page.save,
		publish: page.publish,
	};
	const status = describePageStatus({
		...page.record,
		draft: page.validation.success ? page.validation.data : page.layout,
	});
	const statusLabel =
		status.kind === 'draft'
			? 'Rascunho'
			: status.kind === 'published'
				? `Publicada em ${dateTime.format(new Date(status.publishedAt))}`
				: 'Alterações não publicadas';

	return (
		<div className="min-w-0 space-y-4">
			<PageHeader
				title="Página do evento"
				description="Monte sua página arrastando seções. Selecione o conteúdo para editar e confira em diferentes tamanhos de tela."
				actions={
					<div className="flex flex-wrap gap-2">
						<Button variant="outline" size="sm" asChild>
							<Link href={`/admin/eventos/${event.id}/previa`} target="_blank">
								Ver prévia
								<ExternalLink className="ml-2 size-4" />
							</Link>
						</Button>
						{page.record.enabled && event.slug && (
							<Button variant="outline" size="sm" asChild>
								<Link href={`/eventos/${event.slug}`} target="_blank">
									Ver página
									<ExternalLink className="ml-2 size-4" />
								</Link>
							</Button>
						)}
						{page.record.enabled && canPublish && (
							<Button
								size="sm"
								variant="outline"
								disabled={Boolean(page.busy)}
								onClick={() => setConfirmUnpublish(true)}
							>
								Voltar ao padrão
							</Button>
						)}
					</div>
				}
			/>
			<div className="flex flex-wrap items-center gap-3 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm">
				<Sparkles className="size-4 text-primary" aria-hidden />
				<Badge variant="secondary">{statusLabel}</Badge>
				{!canEdit && <span>Modo de consulta</span>}
				<span aria-live="polite" className="text-muted-foreground">
					{page.busy === 'save'
						? 'Salvando rascunho…'
						: page.busy === 'publish'
							? 'Publicando…'
							: page.dirty
								? 'Alterações ainda não salvas'
								: page.notice || 'Rascunho atualizado'}
				</span>
			</div>
			{page.error.length > 0 && (
				<Alert variant="destructive">
					<AlertDescription>
						<p className="font-semibold">Não foi possível concluir a operação.</p>
						<ul className="mt-1 list-disc pl-5">
							{page.error.map((message, index) => (
								<li key={index}>{message}</li>
							))}
						</ul>
						<p className="mt-2">Suas alterações continuam no editor. Corrija os dados ou tente novamente.</p>
					</AlertDescription>
				</Alert>
			)}
			{!page.validation.success && (
				<Alert>
					<AlertDescription>
						<p className="font-semibold">Complete os campos para salvar a página.</p>
						<ul className="mt-1 list-disc pl-5">
							{page.validation.error.issues.map((issue, index) => (
								<li key={index}>{describePageFieldIssue(issue, page.layout)}</li>
							))}
						</ul>
					</AlertDescription>
				</Alert>
			)}
			<ActionsContext.Provider value={actions}>
				<div className={styles.editor} aria-label="Editor visual da página">
					<Puck
						config={config}
						data={page.initialData}
						onChange={page.change}
						onAction={onAction}
						onPublish={page.publish}
						permissions={permissions}
						dictionary={eventEditorDictionary}
						overrides={overrides}
						fieldTransforms={eventFieldTransforms}
						viewports={viewports}
						headerTitle="Sua página"
						headerPath={event.slug ? `/eventos/${event.slug}` : undefined}
						height="calc(100dvh - 13rem)"
						dnd={{ behavior: 'static', enableDragHandle: true }}
					/>
				</div>
			</ActionsContext.Provider>
			<AlertDialog open={confirmUnpublish} onOpenChange={setConfirmUnpublish}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Voltar ao layout padrão</AlertDialogTitle>
						<AlertDialogDescription>
							O público volta a ver a página padrão do evento. Seu rascunho permanece salvo para publicar novamente
							quando quiser.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={Boolean(page.busy)}>Cancelar</AlertDialogCancel>
						<AlertDialogAction
							disabled={Boolean(page.busy)}
							onClick={(e) => {
								e.preventDefault();
								void page.unpublish().then((done) => {
									if (done) setConfirmUnpublish(false);

									return done;
								});
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
