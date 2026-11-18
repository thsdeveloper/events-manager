'use client';

import { useAdminEventScope } from '@/features/event-scope/components/AdminEventScope';
import { rememberEventCreation } from '@/features/event-creation';
import { openEvent } from '@/features/event-scope/api/openEvent';

import { eventAIContext, generateEventContent } from './event-ai';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AIImageGenerationModal } from '@/components/admin/AIImageGenerationModal';
const EventLandingPage = dynamic(
	() => import('@/features/event-page/components/EventLandingPage').then((module) => module.EventLandingPage),
	{
		loading: () => (
			<p role="status" className="p-6 text-sm text-muted-foreground">
				Carregando prévia…
			</p>
		),
	},
);
import { revalidateEventPage } from '@/features/event-page/actions';
import { contentDefaults, contentFromEvent, contentPayload, eventForPreview } from './wizard-content';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { PENDING_UPLOAD_VALUE } from '@/components/admin/ImageUpload';
import {
	migrateEventSalesPeriod,
	buildDefaultEventPageLayout,
	type Event,
	type EventCategory,
	type EventTicket,
} from '@events-manager/contracts';
import type { TicketDraft } from '@/features/tickets/types';
import { useOrganizer } from '@/hooks/useOrganizer';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { WizardProgressBar } from './WizardProgressBar';
import { StepNavigation } from './StepNavigation';
import { PageHeader } from '@/components/design-system/molecules/PageHeader';
import { Tabs, TabsContent } from '@/components/ui/base-tabs';
import { BasicInfoStep } from './steps/BasicInfoStep';
const CoverImageStep = dynamic(() => import('./steps/CoverImageStep').then((module) => module.CoverImageStep), {
	loading: () => (
		<p role="status" className="p-6 text-sm text-muted-foreground">
			Carregando etapa…
		</p>
	),
});
const DetailsStep = dynamic(() => import('./steps/DetailsStep').then((module) => module.DetailsStep), {
	loading: () => (
		<p role="status" className="p-6 text-sm text-muted-foreground">
			Carregando etapa…
		</p>
	),
});
const ScheduleStep = dynamic(() => import('./steps/ScheduleStep').then((module) => module.ScheduleStep), {
	loading: () => (
		<p role="status" className="p-6 text-sm text-muted-foreground">
			Carregando etapa…
		</p>
	),
});
const LocationStep = dynamic(() => import('./steps/LocationStep').then((module) => module.LocationStep), {
	loading: () => (
		<p role="status" className="p-6 text-sm text-muted-foreground">
			Carregando etapa…
		</p>
	),
});
const TicketsStep = dynamic(() => import('./steps/TicketsStep').then((module) => module.TicketsStep), {
	loading: () => (
		<p role="status" className="p-6 text-sm text-muted-foreground">
			Carregando etapa…
		</p>
	),
});
const ReviewStep = dynamic(() => import('./steps/ReviewStep').then((module) => module.ReviewStep), {
	loading: () => (
		<p role="status" className="p-6 text-sm text-muted-foreground">
			Carregando etapa…
		</p>
	),
});
import type { EventWizardFormValues, EventWizardStepMeta, EventWizardSnapshot } from './types';
import {
	basicInfoSchema,
	coverImageSchema,
	detailsSchema,
	eventWizardSchema,
	locationSchema,
	scheduleSchema,
	ticketsSchema,
} from './validation';

const LOCAL_STORAGE_KEY = 'event-creation-wizard';

const steps: EventWizardStepMeta[] = [
	{
		id: 'basic',
		title: 'Básico',
		description: 'Nome, categoria e resumo',
		estimatedMinutes: 1,
	},
	{
		id: 'details',
		title: 'Detalhes',
		description: 'Descrição completa e tags',
		estimatedMinutes: 2,
	},
	{
		id: 'schedule',
		title: 'Agenda',
		description: 'Quando o evento acontece',
		estimatedMinutes: 1,
	},
	{
		id: 'location',
		title: 'Local',
		description: 'Formato e endereço',
		estimatedMinutes: 1,
	},
	{
		id: 'tickets',
		title: 'Ingressos',
		description: 'Capacidade e publicação',
		estimatedMinutes: 1,
	},
	{
		id: 'visual',
		title: 'Visual',
		description: 'Imagem de capa e estilo',
		estimatedMinutes: 1,
	},
	{
		id: 'review',
		title: 'Revisão',
		description: 'Confirme e publique',
		estimatedMinutes: 1,
	},
];

// Persisted positions are stable across releases, even when the visible order changes.
const storedStepIds = ['basic', 'visual', 'details', 'schedule', 'location', 'tickets', 'review'];
const restoreStep = (index: number) =>
	Math.max(
		0,
		steps.findIndex((step) => step.id === storedStepIds[index]),
	);
const storeStep = (index: number) => storedStepIds.indexOf(steps[index].id);

type StoredWizardPayload = {
	formData?: Partial<EventWizardFormValues>;
	meta?: {
		currentStep?: number;
		draftId?: string;
	};
};

const stepFieldGroups: Array<(keyof EventWizardFormValues)[]> = [
	['title', 'category_id', 'short_description'],
	['description', 'description_en', 'description_es', 'tags'],
	['start_date', 'end_date'],
	[
		'event_type',
		'location_tbd',
		'show_map',
		'location_name',
		'location_address',
		'latitude',
		'longitude',
		'online_url',
		'online_platform',
		'location_street',
		'location_number',
		'location_complement',
		'location_neighborhood',
		'location_city',
		'location_state',
		'location_postal_code',
	],
	['is_free', 'tickets', 'max_attendees', 'status', 'visibility', 'featured', 'publish_after_create'],
	['cover_image', 'cover_image_alt'],
	[
		'title',
		'category_id',
		'short_description',
		'description',
		'tags',
		'start_date',
		'end_date',
		'event_type',
		'is_free',
		'tickets',
		'status',
	],
];

const emptyValues: EventWizardFormValues = {
	...contentDefaults,
	ticket_groups: [],
	title: '',
	category_id: '',
	short_description: '',
	cover_image: '',
	description: '',
	tags: [],
	start_date: '',
	end_date: '',
	event_type: 'in_person',
	location_name: '',
	location_address: '',
	latitude: null,
	longitude: null,
	online_url: '',
	is_free: true,
	tickets: [],
	max_attendees: null,
	status: 'draft',
	visibility: 'public',
	featured: false,
	publish_after_create: false,
};

function relationId(value: unknown): string {
	if (!value) return '';
	if (typeof value === 'string') return value;

	return typeof value === 'object' && 'id' in value ? String((value as { id: unknown }).id) : '';
}

/** Os ingressos existentes entram no formulário só para a revisão e a regra do evento pago. */
function ticketDraft(ticket: EventTicket): TicketDraft {
	return {
		id: ticket.id,
		group_id: ticket.group_id ?? null,
		admission_type: ticket.admission_type ?? 'standard',
		title: ticket.title ?? '',
		description: ticket.description ?? null,
		quantity: ticket.quantity ?? 0,
		price: Number(ticket.price ?? 0),
		service_fee_type: (ticket.service_fee_type ?? 'passed_to_buyer') as TicketDraft['service_fee_type'],
		visibility: (ticket.visibility ?? 'public') as TicketDraft['visibility'],
		sale_start_date: ticket.sale_start_date ?? null,
		sale_end_date: ticket.sale_end_date ?? null,
		min_quantity_per_purchase: ticket.min_quantity_per_purchase ?? 1,
		max_quantity_per_purchase: ticket.max_quantity_per_purchase ?? 5,
		allow_installments: ticket.allow_installments ?? false,
		max_installments: ticket.max_installments ?? null,
	};
}

/** O evento guardado, na forma que o assistente edita. */
function valuesFromEvent(event: Event): EventWizardFormValues {
	const tickets = (event.tickets ?? []).filter((ticket): ticket is EventTicket => typeof ticket !== 'string');

	return {
		...emptyValues,
		...contentFromEvent(event),
		title: event.title ?? '',
		category_id: relationId(event.category_id),
		short_description: event.short_description ?? '',
		cover_image: relationId(event.cover_image),
		description: event.description ?? '',
		tags: Array.isArray(event.tags) ? event.tags : [],
		start_date: event.start_date ?? '',
		end_date: event.end_date ?? '',
		event_type: (event.event_type ?? 'in_person') as EventWizardFormValues['event_type'],
		location_name: event.location_name ?? '',
		location_address: event.location_address ?? '',
		latitude: event.latitude ?? null,
		longitude: event.longitude ?? null,
		online_url: event.online_url ?? '',
		is_free: Boolean(event.is_free),
		tickets: tickets.map(ticketDraft),
		max_attendees: event.max_attendees ?? null,
		visibility: event.visibility ?? 'public',
		status: (event.status ?? 'draft') as EventWizardFormValues['status'],
		featured: Boolean(event.featured),
	};
}

interface EventCreationWizardProps {
	/** `edit` parte do evento guardado e atualiza em vez de criar. */
	mode?: 'create' | 'edit';
	event?: Event;
	initialDraft?: EventWizardSnapshot;
	draftOnly?: boolean;
}

function getStepSchema(stepIndex: number) {
	switch (steps[stepIndex].id) {
		case 'basic':
			return basicInfoSchema;
		case 'visual':
			return coverImageSchema;
		case 'details':
			return detailsSchema;
		case 'schedule':
			return scheduleSchema;
		case 'location':
			return locationSchema;
		case 'tickets':
			return ticketsSchema;
		default:
			return eventWizardSchema;
	}
}

export function EventCreationWizard({
	mode = 'create',
	event,
	initialDraft,
	draftOnly = false,
}: EventCreationWizardProps = {}) {
	const isEdit = mode === 'edit' && Boolean(event);
	const router = useRouter();
	const { selectedEventId } = useAdminEventScope();
	const savedEventId = useRef<string | null>(null);
	const { toast } = useToast();
	const { organizer, loading: organizerLoading } = useOrganizer();
	const autoSaveTimeoutRef = useRef<number | undefined>(undefined);
	const initializedRef = useRef(false);
	const submittingRef = useRef(false);
	const submissionCompletedRef = useRef(false);

	const {
		data: categories = [],
		isPending: categoriesLoading,
		isError: categoriesFailed,
		refetch: retryCategories,
	} = useQuery({
		queryKey: ['event-categories'],
		staleTime: 10 * 60 * 1000,
		queryFn: async ({ signal }) => {
			const response = await fetch('/api/event-categories', { signal });
			if (!response.ok) throw new Error('Não foi possível carregar as categorias.');

			return ((await response.json()) as { data: EventCategory[] }).data ?? [];
		},
	});
	const initialStep =
		initialDraft && initialDraft.current_step >= 0 && initialDraft.current_step < steps.length
			? restoreStep(initialDraft.current_step)
			: 0;
	const [currentStep, setCurrentStep] = useState(initialStep);
	const [serverDraftId, setServerDraftId] = useState<string | undefined>(initialDraft?.id);
	const [serverDraftSaving, setServerDraftSaving] = useState(false);
	const [serverDraftError, setServerDraftError] = useState<string | null>(null);
	const [serverDraftSaved, setServerDraftSaved] = useState(false);
	const [previewOpen, setPreviewOpen] = useState(false);
	// Na edição tudo já foi preenchido uma vez: qualquer etapa fica ao alcance.
	const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
		() => new Set(isEdit ? steps.map((_, index) => index) : Array.from({ length: initialStep + 1 }, (_, i) => i)),
	);
	const [isSavingDraft, setIsSavingDraft] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const coverGeneration = useMutation({
		retry: false,
		gcTime: 0,
		mutationFn: (input: Parameters<typeof eventAIContext>[0]) =>
			generateEventContent<{ fileId: string }>('cover', eventAIContext(input)),
	});
	const isGeneratingCover = coverGeneration.isPending;
	const generatingCoverRef = useRef(false);
	const [coverAiError, setCoverAiError] = useState<string | null>(null);
	// The cover is held here, not inside the step, because the step unmounts as soon
	// as the user moves on and the file must survive until the event is submitted.
	const [coverFile, setCoverFile] = useState<File | null>(null);
	const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

	const form = useForm<EventWizardFormValues>({
		mode: 'onBlur',
		reValidateMode: 'onChange',
		// Don't use resolver - we'll validate manually per step
		defaultValues:
			isEdit && event
				? valuesFromEvent(event)
				: initialDraft
					? ({
							...emptyValues,
							...migrateEventSalesPeriod(initialDraft.values),
							cover_image:
								initialDraft.values.cover_image === PENDING_UPLOAD_VALUE
									? ''
									: String(initialDraft.values.cover_image ?? ''),
						} as EventWizardFormValues)
					: emptyValues,
	});

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		// O rascunho local é da criação; na edição o ponto de partida é o evento.
		if (isEdit || initialDraft) return;
		const stored = window.localStorage.getItem(LOCAL_STORAGE_KEY);
		if (!stored) {
			return;
		}

		try {
			const parsed = JSON.parse(stored) as StoredWizardPayload | Partial<EventWizardFormValues>;
			let formData: Partial<EventWizardFormValues> | undefined;
			let storedStep: number | undefined;

			if (parsed && typeof parsed === 'object' && ('formData' in parsed || 'meta' in parsed)) {
				const payload = parsed as StoredWizardPayload;
				formData = payload.formData ?? undefined;
				storedStep = typeof payload.meta?.currentStep === 'number' ? restoreStep(payload.meta.currentStep) : undefined;
				if (payload.meta?.draftId) setServerDraftId(payload.meta.draftId);
			} else {
				formData = parsed as Partial<EventWizardFormValues>;
			}

			if (formData && Object.keys(formData).length > 0) {
				form.reset({
					...form.getValues(),
					...migrateEventSalesPeriod(formData),
					// A pending cover only lives in memory, so a reloaded draft must not
					// claim to still have one.
					cover_image: formData.cover_image === PENDING_UPLOAD_VALUE ? '' : (formData.cover_image ?? ''),
				});
			}

			if (typeof storedStep === 'number' && storedStep >= 0 && storedStep < steps.length) {
				setCurrentStep(storedStep);
				setVisitedSteps(new Set(Array.from({ length: storedStep + 1 }, (_, index) => index)));
			}
		} catch (error) {
			console.error('Erro ao carregar rascunho do evento', error);
		}
	}, [form, isEdit, initialDraft]);

	const handleCoverFileSelected = useCallback((file: File | null) => {
		setCoverFile(file);
		setCoverPreviewUrl((current) => {
			if (current) URL.revokeObjectURL(current);

			return file ? URL.createObjectURL(file) : null;
		});
	}, []);

	useEffect(
		() => () => {
			if (coverPreviewUrl) URL.revokeObjectURL(coverPreviewUrl);
		},
		[coverPreviewUrl],
	);

	const persistDraft = useCallback(
		(formValues: Partial<EventWizardFormValues>, stepOverride?: number, draftIdOverride?: string) => {
			if (typeof window === 'undefined' || isEdit) {
				return false;
			}

			try {
				const payload: StoredWizardPayload = {
					formData: formValues,
					meta: {
						currentStep: storeStep(typeof stepOverride === 'number' ? stepOverride : currentStep),
						draftId: draftIdOverride ?? serverDraftId,
					},
				};
				window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));

				return true;
			} catch (error) {
				console.error('Erro ao salvar rascunho do evento', error);

				return false;
			}
		},
		[currentStep, isEdit, serverDraftId],
	);

	const saveServerDraft = useCallback(async () => {
		if (isEdit || serverDraftSaving || initialDraft?.event_id) return;
		const current = form.getValues();
		persistDraft(current);
		setServerDraftSaving(true);
		setServerDraftError(null);
		setServerDraftSaved(false);
		const values = Object.fromEntries(
			Object.keys(emptyValues).map((key) => [key, current[key as keyof EventWizardFormValues]]),
		);
		if (values.cover_image === PENDING_UPLOAD_VALUE || String(values.cover_image ?? '').startsWith('blob:'))
			values.cover_image = '';
		try {
			const body = JSON.stringify({ values, current_step: storeStep(currentStep) }, (_key, value) =>
				typeof File !== 'undefined' && value instanceof File
					? undefined
					: typeof value === 'string' && value.startsWith('blob:')
						? undefined
						: value,
			);
			const response = await fetch(
				serverDraftId ? '/api/event-drafts/' + encodeURIComponent(serverDraftId) : '/api/event-drafts',
				{
					method: serverDraftId ? 'PUT' : 'POST',
					credentials: 'include',
					headers: { 'Content-Type': 'application/json' },
					body,
				},
			);
			const saved = await response.json().catch(() => null);
			if (!response.ok) throw new Error(saved?.detail ?? 'Não foi possível salvar o rascunho na conta.');
			if (typeof saved?.id !== 'string') throw new Error('O servidor não confirmou o salvamento do rascunho.');
			setServerDraftId(saved.id);
			persistDraft(form.getValues(), currentStep, saved.id);
			setServerDraftSaved(JSON.stringify(current) === JSON.stringify(form.getValues()));
		} catch (cause) {
			setServerDraftError(cause instanceof Error ? cause.message : 'Não foi possível salvar o rascunho na conta.');
		} finally {
			setServerDraftSaving(false);
		}
	}, [currentStep, form, initialDraft?.event_id, isEdit, persistDraft, serverDraftId, serverDraftSaving]);

	useEffect(() => {
		if (typeof window === 'undefined' || isEdit) {
			return;
		}

		const subscription = form.watch((values) => {
			if (!initializedRef.current) {
				initializedRef.current = true;

				return;
			}

			setServerDraftSaved(false);
			setIsSavingDraft(true);
			window.clearTimeout(autoSaveTimeoutRef.current);

			autoSaveTimeoutRef.current = window.setTimeout(() => {
				const saved = persistDraft(values as Partial<EventWizardFormValues>);
				setIsSavingDraft(false);
				if (saved) {
					setLastSaved(new Date());
				}
			}, 600);
		});

		return () => {
			subscription.unsubscribe();
			window.clearTimeout(autoSaveTimeoutRef.current);
		};
	}, [form, isEdit, persistDraft]);

	const goToStep = useCallback(
		(stepIndex: number) => {
			setCurrentStep(stepIndex);
			setVisitedSteps((prev) => {
				const updated = new Set(prev);
				for (let index = 0; index <= stepIndex; index += 1) {
					updated.add(index);
				}

				return updated;
			});
			persistDraft(form.getValues(), stepIndex);

			// Without this the scroll position carries over from the previous step and
			// the new step's heading renders underneath the sticky progress bar.
			if (typeof window !== 'undefined') {
				const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
				window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
			}
		},
		[form, persistDraft],
	);

	const generateCover = coverGeneration.mutateAsync;
	const handleGenerateCover = useCallback(async () => {
		if (generatingCoverRef.current) return;
		const values = form.getValues();
		if (!values.title.trim() || !values.category_id) {
			setCoverAiError('Informe o nome e a categoria do evento antes de gerar a capa.');

			return;
		}
		generatingCoverRef.current = true;
		setCoverAiError(null);
		try {
			const data = await generateCover(values);
			if (!data.fileId) throw new Error('Serviço de IA não retornou uma imagem válida.');
			handleCoverFileSelected(null);
			form.setValue('cover_image', data.fileId, { shouldDirty: true, shouldValidate: true });
			toast({ title: 'Capa gerada', description: 'Confira a imagem antes de finalizar o evento.', variant: 'success' });
		} catch (error) {
			setCoverAiError(error instanceof Error ? error.message : 'Não foi possível gerar a capa agora.');
		} finally {
			generatingCoverRef.current = false;
		}
	}, [form, generateCover, handleCoverFileSelected, toast]);

	const handleNext = useCallback(async () => {
		if (currentStep === steps.length - 1) {
			return;
		}

		const schema = getStepSchema(currentStep);
		const fields = stepFieldGroups[currentStep];
		const values = fields.reduce<Record<string, unknown>>((acc, key) => {
			acc[key] = form.getValues(key);

			return acc;
		}, {});

		const parseResult = schema.safeParse(values);
		if (!parseResult.success) {
			parseResult.error.issues.forEach((issue) => {
				const path = issue.path[0] as keyof EventWizardFormValues;
				form.setError(path, { message: issue.message });
			});
			toast({
				title: 'Revise os campos destacados',
				description: 'Complete as informações obrigatórias antes de seguir.',
				variant: 'destructive',
			});

			return;
		}

		goToStep(currentStep + 1);
	}, [currentStep, form, goToStep, toast]);

	const handleBack = useCallback(() => {
		const targetStep = Math.max(currentStep - 1, 0);
		if (targetStep !== currentStep) {
			goToStep(targetStep);
		}
	}, [currentStep, goToStep]);

	const handleSelectStep = useCallback(
		(stepIndex: number) => {
			if (!visitedSteps.has(stepIndex)) {
				return;
			}

			goToStep(stepIndex);
		},
		[goToStep, visitedSteps],
	);

	/**
	 * Valida o formulário inteiro e, se algo falhar, leva a pessoa até a etapa
	 * do primeiro problema: um erro numa etapa que ela não está vendo seria
	 * invisível.
	 */
	const validateAll = useCallback(
		(values: EventWizardFormValues) => {
			const validationResult = eventWizardSchema.safeParse(values);
			if (validationResult.success) return true;

			validationResult.error.issues.forEach((issue) => {
				const path = issue.path[0] as keyof EventWizardFormValues;
				form.setError(path, { message: issue.message });
			});
			const firstField = validationResult.error.issues[0]?.path[0] as keyof EventWizardFormValues | undefined;
			const failingStep = firstField
				? stepFieldGroups.findIndex((fields, index) => index < steps.length - 1 && fields.includes(firstField))
				: -1;
			if (failingStep >= 0 && failingStep !== currentStep) goToStep(failingStep);
			toast({
				title: 'Revise os campos destacados',
				description: 'Complete as informações obrigatórias antes de salvar.',
				variant: 'destructive',
			});

			return false;
		},
		[currentStep, form, goToStep, toast],
	);

	const submitValues = useCallback(
		async (values: EventWizardFormValues) => {
			if (draftOnly || submittingRef.current || submissionCompletedRef.current) return;
			if (initialDraft?.event_id) {
				await openEvent(router, initialDraft.event_id, selectedEventId);

				return;
			}
			if (!validateAll(values)) return;

			submittingRef.current = true;
			setIsSubmitting(true);

			try {
				if (savedEventId.current) {
					await openEvent(router, savedEventId.current, selectedEventId);
					submissionCompletedRef.current = true;

					return;
				}
				// Na edição a posse do evento já foi verificada pela API ao carregá-lo.
				if (!isEdit && !organizer?.id) {
					throw new Error('Crie um perfil de organizador antes de publicar eventos.');
				}

				// The cover reaches storage only now, at the very end: uploading on
				// selection would leave an orphan file behind for every abandoned draft.
				let coverImageId: string | null = null;
				if (coverFile) {
					const formData = new FormData();
					formData.append('file', coverFile);
					const uploadResponse = await fetch('/api/upload?folder=events', { method: 'POST', body: formData });
					const uploaded = await uploadResponse.json().catch(() => null);
					if (!uploadResponse.ok) {
						throw new Error(uploaded?.detail ?? 'Não foi possível enviar a imagem de capa.');
					}
					coverImageId = uploaded.fileId;
				} else if (values.cover_image && values.cover_image !== PENDING_UPLOAD_VALUE) {
					// Covers produced by the AI generator are already stored server-side.
					coverImageId = values.cover_image;
				}

				if (isEdit && event) {
					// Um evento pago que vira gratuito com ingressos cadastrados deixaria
					// vendas órfãs; a página do evento é o lugar de remover os ingressos.
					// Um evento já gratuito pode ter tipos de ingresso (categorias de inscrição).
					if (values.is_free && !event.is_free && values.tickets.length > 0) {
						throw new Error(
							`Este evento possui ${values.tickets.length} ingresso(s) cadastrado(s). Remova todos os ingressos antes de marcá-lo como gratuito.`,
						);
					}
					const response = await fetch(`/api/events/${event.id}`, {
						method: 'PATCH',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							...contentPayload(values),
							title: values.title,
							description: values.description,
							short_description: values.short_description || null,
							start_date: values.start_date,
							end_date: values.end_date,
							event_type: values.event_type,
							max_attendees: values.max_attendees ?? null,
							status: values.status,
							visibility: values.visibility ?? 'public',
							is_free: values.is_free,
							category_id: values.category_id || null,
							tags: values.tags ?? [],
							featured: values.featured,
							cover_image: coverImageId,
						}),
					});
					if (!response.ok) {
						const problem = await response.json().catch(() => null);
						throw new Error(problem?.detail ?? 'Não foi possível salvar o evento.');
					}
					if (event.slug) await revalidateEventPage(event.slug).catch(() => undefined);
					toast({ title: 'Evento atualizado', description: 'As alterações já estão salvas.', variant: 'success' });
					await openEvent(router, event.id, selectedEventId);

					return;
				}

				const eventData: Record<string, unknown> = {
					...contentPayload(values),
					draft_id: serverDraftId,
					ticket_groups: values.ticket_groups ?? [],
					title: values.title,
					description: values.description,
					short_description: values.short_description || null,
					start_date: values.start_date,
					end_date: values.end_date,
					event_type: values.event_type,
					max_attendees: values.max_attendees ?? null,
					status: values.status,
					visibility: values.visibility ?? 'public',
					is_free: values.is_free,
					// Tickets ride along with the event so the API can reject a paid event
					// without one and create both in a single atomic call.
					tickets: values.tickets.map(({ clientId, id, ...ticket }) => ticket),
					category_id: values.category_id || null,
					tags: values.tags ?? [],
					featured: values.featured,
					cover_image: coverImageId,
				};

				const slug =
					values.title
						.toLowerCase()
						.normalize('NFD')
						.replace(/[\u0300-\u036f]/g, '')
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/^-+|-+$/g, '') +
					'-' +
					Math.random().toString(36).substring(2, 8);

				eventData.slug = slug;

				const response = await fetch('/api/events', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(eventData),
				});
				if (!response.ok) {
					const problem = await response.json().catch(() => null);
					throw new Error(problem?.detail ?? 'Não foi possível salvar o evento.');
				}
				const created = (await response.json()) as { id: string; status?: Event['status'] };
				const actualStatus = created.status ?? values.status;
				if (slug) await revalidateEventPage(slug).catch(() => undefined);
				window.localStorage.removeItem(LOCAL_STORAGE_KEY);
				rememberEventCreation(created.id, actualStatus);

				savedEventId.current = created.id;
				await openEvent(router, created.id, selectedEventId);
				submissionCompletedRef.current = true;
			} catch (error: any) {
				console.error('Erro ao criar evento', error);
				toast({
					title: 'Não foi possível salvar',
					description: error?.message ?? 'Verifique os campos e tente novamente.',
					variant: 'destructive',
				});
			} finally {
				submittingRef.current = false;
				setIsSubmitting(false);
			}
		},
		[
			draftOnly,
			coverFile,
			event,
			form,
			isEdit,
			organizer?.id,
			router,
			selectedEventId,
			toast,
			validateAll,
			initialDraft?.event_id,
			serverDraftId,
		],
	);

	const onSubmit = useCallback(
		async (values: EventWizardFormValues) => {
			// Prevent submission if not on the last step
			if (currentStep !== steps.length - 1) return;
			await submitValues(values);
		},
		[currentStep, submitValues],
	);

	// Edição: salvar de qualquer etapa, sem passar pela revisão.
	const handleQuickSave = useCallback(() => {
		void submitValues(form.getValues());
	}, [form, submitValues]);

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === steps.length - 1;

	const stepContent = useMemo(() => {
		switch (steps[currentStep].id) {
			case 'basic':
				return <BasicInfoStep categories={categories} loading={categoriesLoading} />;
			case 'visual':
				return (
					<CoverImageStep
						onChangeCoverImage={(value) =>
							form.setValue('cover_image', value ?? '', { shouldDirty: true, shouldValidate: true })
						}
						onCoverFileSelected={handleCoverFileSelected}
						pendingPreviewUrl={coverPreviewUrl}
						onGenerateCoverImage={handleGenerateCover}
						isGeneratingImage={isGeneratingCover}
						aiError={coverAiError}
					/>
				);
			case 'details':
				return <DetailsStep />;
			case 'schedule':
				return <ScheduleStep />;
			case 'location':
				return <LocationStep />;
			case 'tickets':
				return (
					<TicketsStep
						draftOnly={draftOnly}
						manageTicketsHref={isEdit && event ? `/admin/eventos/${event.id}` : undefined}
					/>
				);
			case 'review':
				return (
					<ReviewStep
						coverPreviewUrl={coverPreviewUrl}
						categories={categories}
						mode={mode}
						onEdit={(id) => goToStep(steps.findIndex((step) => step.id === id))}
					/>
				);
			default:
				return null;
		}
	}, [
		categories,
		categoriesLoading,
		coverAiError,
		coverPreviewUrl,
		currentStep,
		event,
		form,
		goToStep,
		handleCoverFileSelected,
		handleGenerateCover,
		isEdit,
		isGeneratingCover,
		mode,
		draftOnly,
	]);

	// Keep the preview snapshot stable while background autosave updates its status.
	// Rebuilding the layout creates new section ids and would remount the entire preview.
	const previewEvent = useMemo(
		() => (previewOpen ? eventForPreview(form.getValues(), organizer, categories, event) : null),
		[previewOpen, form, organizer, categories, event],
	);
	const previewLayout = useMemo(
		() =>
			previewEvent
				? buildDefaultEventPageLayout({
						...previewEvent,
						cover_image: coverPreviewUrl ? null : previewEvent.cover_image,
					})
				: null,
		[previewEvent, coverPreviewUrl],
	);

	return (
		<Form {...form}>
			{/* The progress bar sticks, so its parent has to be the element that spans
			    the whole scrollable form — a short wrapper would end the stick early. */}
			<form className="space-y-6" onSubmit={(event) => event.preventDefault()}>
				{draftOnly && (
					<p role="status" className="rounded-lg border p-4 text-sm">
						A publicação fica disponível após a aprovação do perfil de organizador. Você já pode salvar seu rascunho e
						ver a prévia.
					</p>
				)}
				<PageHeader
					title={isEdit ? 'Editar evento' : draftOnly ? 'Preparar evento em rascunho' : 'Novo evento'}
					description={isEdit ? event?.title : 'Preencha as etapas para criar e publicar seu evento.'}
					actions={
						<>
							<Button type="button" variant="outline" onClick={() => setPreviewOpen(true)}>
								Prévia
							</Button>
							{!isEdit && (
								<Button
									type="button"
									variant="secondary"
									onClick={() => void saveServerDraft()}
									disabled={serverDraftSaving || Boolean(initialDraft?.event_id)}
								>
									{serverDraftSaving ? 'Salvando rascunho...' : 'Salvar rascunho'}
								</Button>
							)}
						</>
					}
				/>
				{!isEdit && serverDraftSaved && (
					<p role="status" className="text-sm text-muted-foreground">
						Rascunho salvo na sua conta.
					</p>
				)}
				{!isEdit && serverDraftError && (
					<Alert variant="destructive" role="alert" className="border text-sm">
						<AlertDescription>
							<p>{serverDraftError}</p>
							<p>Seu rascunho continua neste navegador. Você pode continuar editando.</p>
							<Button
								type="button"
								variant="outline"
								onClick={() => void saveServerDraft()}
								disabled={serverDraftSaving}
							>
								Tentar salvar novamente
							</Button>
						</AlertDescription>
					</Alert>
				)}
				{categoriesFailed && (
					<Alert variant="destructive">
						<AlertDescription>
							Não foi possível carregar as categorias.{' '}
							<Button type="button" variant="outline" onClick={() => void retryCategories()}>
								Tentar novamente
							</Button>
						</AlertDescription>
					</Alert>
				)}
				<Tabs value={currentStep} className="space-y-5">
					<WizardProgressBar
						steps={steps}
						currentStep={currentStep}
						visitedSteps={visitedSteps}
						onStepSelect={handleSelectStep}
					/>
					{!isEdit && <AutoSaveIndicator isSaving={isSavingDraft} lastSaved={lastSaved} />}

					<div className="relative">
						{/* scroll-mt keeps anything scrolled into view (a focused field, a
					    validation error) clear of the header plus the sticky progress bar. */}
						{steps.map((step, index) => (
							<TabsContent key={step.id} value={index} className="scroll-mt-36">
								{currentStep === index ? stepContent : null}
							</TabsContent>
						))}
						<StepNavigation
							submitLabel={draftOnly ? 'Aguardando aprovação' : isEdit ? 'Salvar alterações' : 'Criar evento'}
							disableNext={draftOnly && isLastStep}
							onSave={isEdit ? handleQuickSave : undefined}
							isFirstStep={isFirstStep}
							isLastStep={isLastStep}
							isSubmitting={isSubmitting}
							isLoadingOrganizer={organizerLoading}
							onBack={handleBack}
							onNext={handleNext}
							onConfirm={() => void form.handleSubmit(onSubmit)()}
						/>
					</div>
				</Tabs>
			</form>

			<Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
				<DialogContent className="max-h-[92vh] max-w-6xl overflow-y-auto p-0">
					<DialogHeader className="border-b p-5">
						<DialogTitle>Prévia do evento</DialogTitle>
						<DialogDescription>
							Veja como está ficando. Esta prévia não publica o evento e a compra está desativada.
						</DialogDescription>
					</DialogHeader>
					{previewEvent && previewLayout && (
						<EventLandingPage
							event={previewEvent}
							layout={previewLayout}
							mode="preview"
							previewCoverUrl={coverPreviewUrl}
						/>
					)}
				</DialogContent>
			</Dialog>
			{isGeneratingCover && (
				<AIImageGenerationModal
					isOpen={isGeneratingCover}
					eventTitle={form.getValues('title') || 'Seu Evento'}
					categoryName={categories.find((c) => c.id === form.getValues('category_id'))?.name}
				/>
			)}
		</Form>
	);
}
