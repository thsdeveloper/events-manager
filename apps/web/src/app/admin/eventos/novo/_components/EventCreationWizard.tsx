'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { type ImageUploadRef } from '@/components/admin/ImageUpload';
import type { EventCategory } from '@events-manager/contracts';
import { useOrganizer } from '@/hooks/useOrganizer';
import { AutoSaveIndicator } from './AutoSaveIndicator';
import { WizardProgressBar } from './WizardProgressBar';
import { StepNavigation } from './StepNavigation';
import { BasicInfoStep } from './steps/BasicInfoStep';
import { CoverImageStep } from './steps/CoverImageStep';
import { DetailsStep } from './steps/DetailsStep';
import { ScheduleStep } from './steps/ScheduleStep';
import { LocationStep } from './steps/LocationStep';
import { TicketsStep } from './steps/TicketsStep';
import { ReviewStep } from './steps/ReviewStep';
import { AIImageGenerationModal } from '@/components/admin/AIImageGenerationModal';
import type { EventWizardFormValues, EventWizardStepMeta } from './types';
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

const Confetti = dynamic(() => import('react-confetti'), { ssr: false });

const steps: EventWizardStepMeta[] = [
	{
		id: 'basic',
		title: 'Básico',
		description: 'Nome, categoria e resumo',
		estimatedMinutes: 1,
	},
	{
		id: 'visual',
		title: 'Visual',
		description: 'Imagem de capa e estilo',
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
		description: 'Datas e inscrições',
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
		id: 'review',
		title: 'Revisão',
		description: 'Confirme e publique',
		estimatedMinutes: 1,
	},
];

type StoredWizardPayload = {
	formData?: Partial<EventWizardFormValues>;
	meta?: {
		currentStep?: number;
	};
};

const stepFieldGroups: Array<(keyof EventWizardFormValues)[]> = [
	['title', 'category_id', 'short_description'],
	['cover_image'],
	['description', 'tags'],
	['start_date', 'end_date', 'registration_start', 'registration_end'],
	['event_type', 'location_name', 'location_address', 'online_url'],
	['is_free', 'max_attendees', 'status', 'featured', 'publish_after_create'],
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
		'status',
	],
];

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

export function EventCreationWizard() {
	const router = useRouter();
	const { toast } = useToast();
	const { organizer, loading: organizerLoading } = useOrganizer();
	const imageUploadRef = useRef<ImageUploadRef>(null);
	const autoSaveTimeoutRef = useRef<number | undefined>(undefined);
	const initializedRef = useRef(false);
	const celebrationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const [categories, setCategories] = useState<EventCategory[]>([]);
	const [currentStep, setCurrentStep] = useState(0);
	const [visitedSteps, setVisitedSteps] = useState<Set<number>>(new Set([0]));
	const [isSavingDraft, setIsSavingDraft] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isGeneratingCover, setIsGeneratingCover] = useState(false);
	const [coverAiError, setCoverAiError] = useState<string | null>(null);
	const [showCelebration, setShowCelebration] = useState(false);
	const [confettiSize, setConfettiSize] = useState({ width: 0, height: 0 });

	const form = useForm<EventWizardFormValues>({
		mode: 'onBlur',
		reValidateMode: 'onChange',
		// Don't use resolver - we'll validate manually per step
		defaultValues: {
			title: '',
			category_id: '',
			short_description: '',
			cover_image: '',
			description: '',
			tags: [],
			start_date: '',
			end_date: '',
			registration_start: '',
			registration_end: '',
			event_type: 'in_person',
			location_name: '',
			location_address: '',
			online_url: '',
			is_free: true,
			max_attendees: null,
			status: 'draft',
			featured: false,
			publish_after_create: false,
		},
	});

	const watchedValues = form.watch();

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const updateSize = () => {
			setConfettiSize({ width: window.innerWidth, height: window.innerHeight });
		};

		updateSize();
		window.addEventListener('resize', updateSize);

		return () => {
			window.removeEventListener('resize', updateSize);
			if (celebrationTimeoutRef.current) {
				clearTimeout(celebrationTimeoutRef.current);
			}
		};
	}, []);


	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

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
				storedStep = payload.meta?.currentStep;
			} else {
				formData = parsed as Partial<EventWizardFormValues>;
			}

			if (formData && Object.keys(formData).length > 0) {
				form.reset({
					...form.getValues(),
					...formData,
				});
			}

			if (typeof storedStep === 'number' && storedStep >= 0 && storedStep < steps.length) {
				setCurrentStep(storedStep);
				setVisitedSteps(new Set(Array.from({ length: storedStep + 1 }, (_, index) => index)));
			}
		} catch (error) {
			console.error('Erro ao carregar rascunho do evento', error);
		}
	}, [form]);

	const persistDraft = useCallback(
		(formValues: Partial<EventWizardFormValues>, stepOverride?: number) => {
			if (typeof window === 'undefined') {
				return false;
			}

			try {
				const payload: StoredWizardPayload = {
					formData: formValues,
					meta: {
						currentStep: typeof stepOverride === 'number' ? stepOverride : currentStep,
					},
				};
				window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));

				return true;
			} catch (error) {
				console.error('Erro ao salvar rascunho do evento', error);

				return false;
			}
		},
		[currentStep],
	);

	useEffect(() => {
		if (typeof window === 'undefined') {
			return;
		}

		const subscription = form.watch(values => {
			if (!initializedRef.current) {
				initializedRef.current = true;

				return;
			}

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
	}, [form, persistDraft]);

	useEffect(() => {
		const loadCategories = async () => {
			try {
				const response = await fetch('/api/event-categories');
				if (!response.ok) throw new Error('Não foi possível carregar as categorias.');
				const payload = (await response.json()) as { data: EventCategory[] };
				setCategories(payload.data ?? []);
			} catch (error) {
				console.error('Erro ao carregar categorias', error);
			}
		};

		loadCategories();
	}, []);

	const goToStep = useCallback(
		(stepIndex: number) => {
			setCurrentStep(stepIndex);
			setVisitedSteps(prev => {
				const updated = new Set(prev);
				for (let index = 0; index <= stepIndex; index += 1) {
					updated.add(index);
				}

				return updated;
			});
			persistDraft(form.getValues(), stepIndex);
		},
		[form, persistDraft],
	);

	const handleGenerateCover = useCallback(async () => {
		setCoverAiError(null);
		setIsGeneratingCover(true);

		try {
			const { title, description, short_description, category_id: categoryId } = form.getValues();
			if (!title) {
				setCoverAiError('Informe o título do evento antes de gerar a capa.');
				setIsGeneratingCover(false);

				return;
			}

			// Start the API call
			const response = await fetch('/api/ai/generate-cover', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title,
					description,
					short_description,
					categoryId
				}),
			});

			if (!response.ok) {
				let errorMessage = 'Não foi possível gerar a capa agora.';
				try {
					const data = await response.json();
					// RFC 7807 format
					errorMessage = data?.detail || data?.error || errorMessage;
				} catch {
					// ignore
				}

				throw new Error(errorMessage);
			}

			const data = await response.json();
			if (!data?.fileId) {
				throw new Error('Serviço de IA não retornou uma imagem válida.');
			}

			form.setValue('cover_image', data.fileId, { shouldDirty: true, shouldValidate: true });
			toast({
				title: 'Imagem gerada com sucesso!',
				description: 'Revise o resultado e ajuste se precisar.',
				variant: 'success',
			});
		} catch (error) {
			setCoverAiError(error instanceof Error ? error.message : 'Não foi possível gerar a capa agora.');
			toast({
				title: 'Erro ao gerar imagem',
				description: error instanceof Error ? error.message : 'Não foi possível gerar a capa agora.',
				variant: 'destructive',
			});
		} finally {
			setIsGeneratingCover(false);
		}
	}, [form, toast]);

	const handleNext = useCallback(async () => {
		if (currentStep === steps.length - 1) {
			return;
		}

		const schema = getStepSchema(currentStep);
		const fields = stepFieldGroups[currentStep];
		const values = fields.reduce<Record<string, unknown>>((acc, key) => {
			acc[key] = (watchedValues as unknown as Record<string, unknown>)[key];

			return acc;
		}, {});

		const parseResult = schema.safeParse(values);
		if (!parseResult.success) {
			parseResult.error.issues.forEach(issue => {
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
	}, [currentStep, form, goToStep, toast, watchedValues]);

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

	const onSubmit = useCallback(
		async (values: EventWizardFormValues) => {
			// Prevent submission if not on the last step
			if (currentStep !== steps.length - 1) {
				return;
			}

			// Validate the entire form with the complete schema
			const validationResult = eventWizardSchema.safeParse(values);
			if (!validationResult.success) {
				validationResult.error.issues.forEach(issue => {
					const path = issue.path[0] as keyof EventWizardFormValues;
					form.setError(path, { message: issue.message });
				});
				toast({
					title: 'Erro de validação',
					description: 'Por favor, revise todos os campos obrigatórios.',
					variant: 'destructive',
				});
				
return;
			}

			setIsSubmitting(true);

			try {
				if (!organizer?.id) {
					throw new Error('Crie um perfil de organizador antes de publicar eventos.');
				}

				// Cover image was already uploaded immediately when selected
				// Just use the value from the form (which is now a fileId or null)
				const coverImageId: string | null = values.cover_image || null;

				const eventData: Record<string, unknown> = {
					title: values.title,
					description: values.description,
					short_description: values.short_description || null,
					start_date: values.start_date,
					end_date: values.end_date,
					event_type: values.event_type,
					location_name: values.location_name || null,
					location_address: values.location_address || null,
					online_url: values.online_url || null,
					max_attendees: values.max_attendees ?? null,
					registration_start: values.registration_start || null,
					registration_end: values.registration_end || null,
					status: values.status,
					is_free: values.is_free,
					category_id: values.category_id || null,
					tags: values.tags?.length ? values.tags : null,
					featured: values.featured,
					cover_image: coverImageId,
				};

				const slug =
					values.title
						.toLowerCase()
						.normalize('NFD')
						.replace(/[\u0300-\u036f]/g, '')
						.replace(/[^a-z0-9]+/g, '-')
						.replace(/^-+|-+$/g, '') + '-' + Math.random().toString(36).substring(2, 8);

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
				const created = (await response.json()) as { id: string };

				window.localStorage.removeItem(LOCAL_STORAGE_KEY);

				toast({
					title: 'Evento criado com sucesso!',
					description: values.publish_after_create
						? 'Seu evento está no ar. Que tal compartilhar agora?'
						: 'O evento foi salvo como rascunho. Publique quando estiver pronto.',
					variant: 'success',
				});

				setShowCelebration(true);
				if (celebrationTimeoutRef.current) {
					clearTimeout(celebrationTimeoutRef.current);
				}
				celebrationTimeoutRef.current = setTimeout(() => {
					setShowCelebration(false);
					router.push(`/admin/eventos/${created.id}`);
				}, 3000);
			} catch (error: any) {
				console.error('Erro ao criar evento', error);
				toast({
					title: 'Não foi possível salvar',
					description: error?.message ?? 'Verifique os campos e tente novamente.',
					variant: 'destructive',
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[currentStep, form, organizer?.id, router, toast],
	);

	const isFirstStep = currentStep === 0;
	const isLastStep = currentStep === steps.length - 1;

	const stepContent = useMemo(() => {
		switch (steps[currentStep].id) {
			case 'basic':
				return <BasicInfoStep categories={categories} />;
			case 'visual':
				return (
					<CoverImageStep
						imageUploadRef={imageUploadRef}
						onChangeCoverImage={value => form.setValue('cover_image', value ?? '', { shouldDirty: true, shouldValidate: true })}
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
				return <TicketsStep />;
			case 'review':
				return <ReviewStep categories={categories} />;
			default:
				return null;
		}
	}, [categories, coverAiError, currentStep, form, handleGenerateCover, isGeneratingCover]);

	const handleFormSubmit = useCallback(
		(e: React.FormEvent<HTMLFormElement>) => {
			e.preventDefault();

			// Only allow submission on the last step
			if (currentStep !== steps.length - 1) {
				return;
			}

			// Call react-hook-form's handleSubmit
			form.handleSubmit(onSubmit)(e);
		},
		[currentStep, form, onSubmit],
	);

	return (
		<Form {...form}>
			<form className="space-y-8" onSubmit={handleFormSubmit}>
				<div className="flex flex-col gap-6">
					<WizardProgressBar
						steps={steps}
						currentStep={currentStep}
						visitedSteps={visitedSteps}
						onStepSelect={handleSelectStep}
					/>
					<AutoSaveIndicator isSaving={isSavingDraft} lastSaved={lastSaved} />
				</div>

				<div className="relative">
					<div className="rounded-2xl border border-primary/20 bg-primary/5 p-1 transition-colors dark:border-primary/30 dark:bg-primary/10">
						{stepContent}
					</div>
					<StepNavigation
						isFirstStep={isFirstStep}
						isLastStep={isLastStep}
						isSubmitting={isSubmitting}
						isLoadingOrganizer={organizerLoading}
						onBack={handleBack}
						onNext={handleNext}
					/>
				</div>
			</form>

			{showCelebration && confettiSize.width > 0 && confettiSize.height > 0 && (
				<div className="pointer-events-none fixed inset-0 z-40">
					<Confetti width={confettiSize.width} height={confettiSize.height} recycle={false} numberOfPieces={420} />
				</div>
			)}

			<AIImageGenerationModal
				isOpen={isGeneratingCover}
				eventTitle={form.watch('title') || 'Seu Evento'}
				categoryName={categories.find(c => c.id === form.watch('category_id'))?.name}
			/>
		</Form>
	);
}
