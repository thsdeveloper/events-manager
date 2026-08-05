'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
	User,
	Sparkles,
	CheckCircle2,
	ArrowRight,
	ArrowLeft,
	Save,
	Shield,
	Lock,
	Loader2,
	HelpCircle,
	Trophy,
	Info,
	XCircle,
	AlertCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '@/components/ui/tooltip';

// Schema de validação otimizado com mensagens humanizadas
const formSchema = z.object({
	// Etapa 1: Quem é Você
	organizationName: z.string()
		.min(3, 'Que tal um nome mais completo? Mínimo 3 letras 😊')
		.max(100, 'Nome muito longo. Máximo 100 caracteres'),

	contactEmail: z.string()
		.email('Ops! Confira se digitou o email corretamente (precisa ter @ e domínio)')
		.max(100, 'Email muito longo'),

	phone: z.string()
		.min(10, 'Digite o DDD seguido do número — ex: 61999998888')
		.max(15, 'Telefone muito longo. Use apenas números com DDD')
		.regex(/^\d+$/, 'Use apenas números (sem traços ou parênteses)'),

	document: z.string().optional(),

	website: z.string()
		.url('URL inválida. Deve começar com https:// ou http://')
		.optional()
		.or(z.literal('')),

	instagram: z.string()
		.max(50, 'Nome de usuário muito longo')
		.optional(),

	hasExperience: z.string()
		.min(1, 'Escolha uma opção para continuar'),

	// Etapa 2: Sobre seus Eventos
	eventTypes: z.array(z.string())
		.min(1, 'Escolha pelo menos um tipo de evento que você organiza'),

	estimatedAttendees: z.string()
		.min(1, 'Selecione o tamanho médio do público'),

	eventFrequency: z.string()
		.min(1, 'Informe com que frequência você organiza eventos'),

	description: z.string()
		.min(50, 'Conte um pouco mais sobre seus eventos (mínimo 50 caracteres)')
		.max(500, 'Descrição muito longa (máximo 500 caracteres)'),

	goals: z.string()
		.min(20, 'Compartilhe seus objetivos com mais detalhes (mínimo 20 caracteres)')
		.max(300, 'Muito texto! Resuma em até 300 caracteres'),

	// Etapa 3: Confirmação
	acceptTerms: z.boolean()
		.refine(val => val === true, 'Você precisa aceitar os termos para continuar')
});

type FormData = z.infer<typeof formSchema>;
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

const EVENT_TYPES = [
	{ value: 'shows', label: 'Shows e Festivais', emoji: '🎵' },
	{ value: 'parties', label: 'Festas e Baladas', emoji: '🎉' },
	{ value: 'corporate', label: 'Eventos Corporativos', emoji: '💼' },
	{ value: 'workshops', label: 'Workshops e Cursos', emoji: '📚' },
	{ value: 'sports', label: 'Esportivos', emoji: '⚽' },
	{ value: 'culture', label: 'Teatro e Cultura', emoji: '🎭' }
];

const EXPERIENCE_LEVELS = [
	{ value: 'yes', label: 'Sim, sou experiente', description: 'Já organizei vários eventos' },
	{ value: 'some', label: 'Alguns eventos', description: 'Tenho alguma experiência' },
	{ value: 'beginner', label: 'Estou começando', description: 'Primeiro contato com produção' }
];

const steps = [
	{
		id: 1,
		title: 'Quem é Você',
		shortTitle: 'Identificação',
		icon: User,
		description: 'Informações básicas e contato',
		estimatedTime: '60 segundos'
	},
	{
		id: 2,
		title: 'Sobre seus Eventos',
		shortTitle: 'Eventos',
		icon: Sparkles,
		description: 'Tipo, escala e frequência',
		estimatedTime: '90 segundos'
	},
	{
		id: 3,
		title: 'Confirmação',
		shortTitle: 'Confirmar',
		icon: CheckCircle2,
		description: 'Revise e envie',
		estimatedTime: '30 segundos'
	}
];

interface ImprovedMultiStepFormWizardProps {
	user: {
		id: string;
		email: string | null;
		first_name: string | null;
		last_name: string | null;
	};
	onSuccess: () => void;
}

export function ImprovedMultiStepFormWizard({ user, onSuccess }: ImprovedMultiStepFormWizardProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
	const { toast } = useToast();

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		mode: 'onChange', // Validação em tempo real
		defaultValues: {
			organizationName: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
			contactEmail: user.email || '',
			phone: '',
			document: '',
			website: '',
			instagram: '',
			hasExperience: '',
			eventTypes: [],
			estimatedAttendees: '',
			eventFrequency: '',
			description: '',
			goals: '',
			acceptTerms: false
		}
	});

	// Auto-save inteligente com debounce
	const handleAutoSave = useCallback(() => {
		setSaveStatus('saving');
		const values = form.getValues();

		try {
			localStorage.setItem('organizer_form_draft', JSON.stringify({
				...values,
				savedAt: new Date().toISOString()
			}));

			setTimeout(() => {
				setSaveStatus('saved');
				setTimeout(() => setSaveStatus('idle'), 2000);
			}, 500);
		} catch (error) {
			console.error('Auto-save error:', error);
			setSaveStatus('error');
		}
	}, [form]);

	// Auto-save a cada mudança significativa (debounced)
	useEffect(() => {
		const subscription = form.watch(() => {
			const timeout = setTimeout(handleAutoSave, 2000);
			
return () => clearTimeout(timeout);
		});

		return () => subscription.unsubscribe();
	}, [form, handleAutoSave]);

	// Carregar rascunho ao montar
	useEffect(() => {
		const draft = localStorage.getItem('organizer_form_draft');
		if (draft) {
			try {
				const parsed = JSON.parse(draft);
				const { savedAt, ...values } = parsed;

				// Só recupera se foi salvo nas últimas 7 dias
				const savedDate = new Date(savedAt);
				const daysSinceLastSave = (Date.now() - savedDate.getTime()) / (1000 * 60 * 60 * 24);

				if (daysSinceLastSave < 7) {
					form.reset(values);
					toast({
						title: 'Rascunho recuperado! 📝',
						description: 'Continuando de onde você parou.',
						variant: 'default',
					});
				}
			} catch (error) {
				console.error('Error loading draft:', error);
			}
		}
	}, [form, toast]);

	const nextStep = async () => {
		const fieldsToValidate = getFieldsForStep(currentStep);
		const isValid = await form.trigger(fieldsToValidate as any);

		if (isValid) {
			setCurrentStep(prev => Math.min(prev + 1, steps.length));
			window.scrollTo({ top: 0, behavior: 'smooth' });
		} else {
			toast({
				title: 'Ops! Alguns campos precisam de atenção',
				description: 'Confira os campos destacados em vermelho',
				variant: 'destructive',
			});
		}
	};

	const prevStep = () => {
		setCurrentStep(prev => Math.max(prev - 1, 1));
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const getFieldsForStep = (step: number): (keyof FormData)[] => {
		switch (step) {
			case 1:
				return ['organizationName', 'contactEmail', 'phone', 'hasExperience'];
			case 2:
				return ['eventTypes', 'estimatedAttendees', 'eventFrequency', 'description', 'goals'];
			case 3:
				return ['acceptTerms'];
			default:
				return [];
		}
	};

	const onSubmit = async (values: FormData) => {
		setIsSubmitting(true);

		try {
			const response = await fetch('/api/organizer/request', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					name: values.organizationName,
					email: values.contactEmail,
					phone: values.phone,
					description: values.description,
					website: values.website || null,
					instagram: values.instagram || null,
					document: values.document || null,
					event_types: values.eventTypes,
					estimated_attendees: values.estimatedAttendees,
					event_frequency: values.eventFrequency,
					goals: values.goals,
					has_experience: values.hasExperience
				}),
			});

			if (!response.ok) {
				throw new Error('Erro ao enviar solicitação');
			}

			// Limpar rascunho
			localStorage.removeItem('organizer_form_draft');

			toast({
				title: 'Solicitação enviada com sucesso! 🎉',
				description: 'Nossa equipe vai analisar e liberar seu acesso em até 48 horas.',
				variant: 'default',
			});

			onSuccess();
		} catch (error) {
			console.error('Error:', error);
			toast({
				title: 'Erro ao enviar solicitação',
				description: 'Tente novamente mais tarde ou entre em contato com o suporte.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const progress = (currentStep / steps.length) * 100;
	const experience = form.watch('hasExperience');

	return (
		<TooltipProvider>
			<div className="mx-auto max-w-3xl">
				{/* Security Badge */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950/20"
				>
					<div className="flex items-center gap-3">
						<div className="flex size-10 flex-shrink-0 items-center justify-center rounded-full bg-green-600">
							<Shield className="size-5 text-white" />
						</div>
						<div className="flex-1">
							<h3 className="font-semibold text-green-900 dark:text-green-100">
								Seus dados estão seguros
							</h3>
							<p className="text-sm text-green-700 dark:text-green-300">
								Nossa equipe revisa cada solicitação manualmente. Aprovações em até 48h úteis.
							</p>
						</div>
						<Badge className="bg-green-600 text-white">
							<Lock className="mr-1 size-3" />
							Seguro
						</Badge>
					</div>
				</motion.div>

				{/* Progress Section */}
				<div className="mb-8">
					<div className="mb-4 flex items-center justify-between">
						<div>
							<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
								Construindo seu perfil profissional
							</h3>
							<p className="text-xs text-gray-500">
								Etapa {currentStep} de {steps.length} • ~{steps[currentStep - 1].estimatedTime}
							</p>
						</div>

						{/* Auto-save Indicator */}
						<AnimatePresence mode="wait">
							{saveStatus === 'saving' && (
								<motion.div
									initial={{ opacity: 0, y: -10 }}
									animate={{ opacity: 1, y: 0 }}
									exit={{ opacity: 0 }}
									className="flex items-center gap-2 text-xs text-gray-500"
								>
									<Loader2 className="size-3 animate-spin" />
									Salvando...
								</motion.div>
							)}

							{saveStatus === 'saved' && (
								<motion.div
									initial={{ opacity: 0, scale: 0.8 }}
									animate={{ opacity: 1, scale: 1 }}
									exit={{ opacity: 0 }}
									className="flex items-center gap-2 text-xs text-green-600"
								>
									<CheckCircle2 className="size-3" />
									Rascunho salvo
								</motion.div>
							)}
						</AnimatePresence>
					</div>

					{/* Gamified Progress Bar */}
					<div className="relative h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800">
						<motion.div
							className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-600"
							initial={{ width: 0 }}
							animate={{ width: `${progress}%` }}
							transition={{ duration: 0.5, ease: 'easeOut' }}
						/>
					</div>

					{/* Steps Badges */}
					<div className="mt-4 flex gap-2">
						{steps.map((step) => {
							const isCompleted = currentStep > step.id;
							const isCurrent = currentStep === step.id;

							return (
								<Badge
									key={step.id}
									variant={isCompleted ? 'default' : isCurrent ? 'secondary' : 'outline'}
									className={`flex-1 justify-center py-2 ${
										isCompleted
											? 'bg-green-600 text-white'
											: isCurrent
												? 'border-purple-600 bg-purple-50 text-purple-900 dark:bg-purple-950'
												: ''
									}`}
								>
									{isCompleted ? '✓' : step.id} {step.shortTitle}
								</Badge>
							);
						})}
					</div>
				</div>

				{/* Form Content */}
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<Card>
							<CardHeader>
								<CardTitle className="flex items-center gap-3">
									{(() => {
										const Icon = steps[currentStep - 1].icon;
										
return <Icon className="size-6 text-purple-600" />;
									})()}
									{steps[currentStep - 1].title}
								</CardTitle>
								<CardDescription>
									{steps[currentStep - 1].description}
								</CardDescription>
							</CardHeader>

							<CardContent className="space-y-8">
								<AnimatePresence mode="wait">
									<motion.div
										key={currentStep}
										initial={{ opacity: 0, x: 20 }}
										animate={{ opacity: 1, x: 0 }}
										exit={{ opacity: 0, x: -20 }}
										transition={{ duration: 0.3 }}
									>
										{currentStep === 1 && (
											<Step1Fields form={form} experience={experience} />
										)}
										{currentStep === 2 && (
											<Step2Fields form={form} experience={experience} />
										)}
										{currentStep === 3 && (
											<Step3Review form={form} />
										)}
									</motion.div>
								</AnimatePresence>
							</CardContent>
						</Card>

						{/* Navigation */}
						<div className="mt-6 flex items-center justify-between">
							<Button
								type="button"
								variant="outline"
								onClick={prevStep}
								disabled={currentStep === 1}
								className="gap-2"
							>
								<ArrowLeft className="size-4" />
								Voltar
							</Button>

							<div className="flex gap-3">
								{currentStep < steps.length ? (
									<Button
										type="button"
										onClick={nextStep}
										className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
									>
										Continuar
										<ArrowRight className="size-4" />
									</Button>
								) : (
									<Button
										type="submit"
										disabled={isSubmitting}
										className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
									>
										{isSubmitting ? (
											<>
												<motion.div
													animate={{ rotate: 360 }}
													transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
												>
													<Loader2 className="size-4" />
												</motion.div>
												Enviando...
											</>
										) : (
											<>
												<CheckCircle2 className="size-4" />
												Enviar Solicitação
											</>
										)}
									</Button>
								)}
							</div>
						</div>
					</form>
				</Form>
			</div>
		</TooltipProvider>
	);
}

// Step 1: Quem é Você
function Step1Fields({ form, experience }: { form: any; experience: string }) {
	return (
		<div className="space-y-8">
			{/* Seção: Dados Básicos */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Dados Básicos
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<FormField
					control={form.control}
					name="organizationName"
					render={({ field, fieldState }) => (
						<FormItem>
							<FormLabel htmlFor="organizationName" className="flex items-center gap-2 text-base">
								Nome da organização ou marca *
								<Tooltip>
									<TooltipTrigger type="button">
										<HelpCircle className="size-4 text-gray-400 hover:text-purple-600" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										<p className="text-sm">
											Este nome aparecerá em todos os eventos que você publicar na plataforma.
											Pode ser o nome da sua empresa, marca ou até seu nome pessoal.
										</p>
									</TooltipContent>
								</Tooltip>
							</FormLabel>
							<FormControl>
								<div className="relative">
									<Input
										id="organizationName"
										className="h-12 pr-10 text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
										placeholder="Ex: Eventos XYZ, Produções ABC"
										{...field}
									/>
									{fieldState.error && (
										<XCircle className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-red-500" />
									)}
									{!fieldState.error && field.value && field.value.length >= 3 && (
										<CheckCircle2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-green-500" />
									)}
								</div>
							</FormControl>
							<FormDescription>
								Como sua marca aparecerá nos eventos publicados
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<div className="grid gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="contactEmail"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormLabel htmlFor="contactEmail" className="text-base">
									Email de contato *
								</FormLabel>
								<FormControl>
									<div className="relative">
										<Input
											id="contactEmail"
											type="email"
											className="h-12 pr-10 text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
											placeholder="contato@empresa.com"
											{...field}
										/>
										{fieldState.error && (
											<XCircle className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-red-500" />
										)}
										{!fieldState.error && field.value && field.value.includes('@') && (
											<CheckCircle2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-green-500" />
										)}
									</div>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="phone"
						render={({ field, fieldState }) => (
							<FormItem>
								<FormLabel htmlFor="phone" className="text-base">
									Telefone com DDD *
								</FormLabel>
								<FormControl>
									<div className="relative">
										<Input
											id="phone"
											type="tel"
											className="h-12 pr-10 text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
											placeholder="61999998888"
											{...field}
										/>
										{fieldState.error && (
											<XCircle className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-red-500" />
										)}
										{!fieldState.error && field.value && field.value.length >= 10 && (
											<CheckCircle2 className="absolute right-3 top-1/2 size-5 -translate-y-1/2 text-green-500" />
										)}
									</div>
								</FormControl>
								<FormDescription>
									Digite apenas números com DDD — ex: 61999998888
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>

				<FormField
					control={form.control}
					name="document"
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="document" className="flex items-center gap-2 text-base">
								CPF ou CNPJ
								<Tooltip>
									<TooltipTrigger type="button">
										<HelpCircle className="size-4 text-gray-400 hover:text-purple-600" />
									</TooltipTrigger>
									<TooltipContent className="max-w-xs">
										<p className="mb-2 text-sm font-semibold">Por que pedimos isso?</p>
										<p className="mb-2 text-sm">
											Facilita a aprovação e permite emissão de notas fiscais futuramente.
										</p>
										<p className="text-sm text-purple-600">
											✨ Perfis com documento são aprovados 2x mais rápido!
										</p>
									</TooltipContent>
								</Tooltip>
								<Badge variant="outline" className="text-xs">Opcional</Badge>
							</FormLabel>
							<FormControl>
								<Input
									id="document"
									className="h-12 text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
									placeholder="000.000.000-00 ou 00.000.000/0000-00"
									{...field}
								/>
							</FormControl>
							<FormDescription>
								Facilita aprovação e emissão de notas fiscais
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</section>

			<Separator />

			{/* Seção: Presença Online */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Presença Online
					</h3>
					<Badge variant="outline" className="text-xs">Opcional mas recomendado</Badge>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="website"
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="website" className="text-base">
									Site oficial
								</FormLabel>
								<FormControl>
									<Input
										id="website"
										type="url"
										className="h-12 text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
										placeholder="https://seusite.com"
										{...field}
										value={field.value || ''}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="instagram"
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="instagram" className="text-base">
									Instagram
								</FormLabel>
								<FormControl>
									<Input
										id="instagram"
										className="h-12 text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
										placeholder="@suamarca"
										{...field}
									/>
								</FormControl>
								<FormDescription>
									Ajuda nossa equipe a conhecer melhor seu trabalho
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</section>

			<Separator />

			{/* Seção: Experiência */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Sua Experiência
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<FormField
					control={form.control}
					name="hasExperience"
					render={({ field }) => (
						<FormItem>
							<FormLabel className="text-base">
								Já organizou eventos antes? *
							</FormLabel>
							<FormControl>
								<div className="grid gap-3">
									{EXPERIENCE_LEVELS.map((level) => (
										<label
											key={level.value}
											className={`flex cursor-pointer items-start gap-4 rounded-lg border-2 p-4 transition-all ${
												field.value === level.value
													? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
													: 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
											}`}
										>
											<input
												type="radio"
												className="mt-1 size-4 text-purple-600 focus:ring-2 focus:ring-purple-600"
												value={level.value}
												checked={field.value === level.value}
												onChange={() => field.onChange(level.value)}
											/>
											<div className="flex-1">
												<div className="font-semibold text-gray-900 dark:text-white">
													{level.label}
												</div>
												<div className="text-sm text-gray-600 dark:text-gray-400">
													{level.description}
												</div>
											</div>
										</label>
									))}
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Contextual Tips */}
				{experience === 'beginner' && (
					<Alert className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20">
						<Sparkles className="size-4 text-purple-600" />
						<AlertTitle className="text-purple-900 dark:text-purple-100">
							Dica para iniciantes
						</AlertTitle>
						<AlertDescription className="text-purple-700 dark:text-purple-300">
							Não tem site ou Instagram ainda? Sem problemas! Você pode adicionar depois no seu perfil.
							O importante agora é contar sobre seus planos para os eventos.
						</AlertDescription>
					</Alert>
				)}

				{experience === 'yes' && (
					<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
						<Trophy className="size-4 text-blue-600" />
						<AlertTitle className="text-blue-900 dark:text-blue-100">
							Organizador experiente!
						</AlertTitle>
						<AlertDescription className="text-blue-700 dark:text-blue-300">
							Compartilhe links de eventos anteriores ou portfolio na próxima etapa.
							Isso acelera muito a aprovação.
						</AlertDescription>
					</Alert>
				)}
			</section>
		</div>
	);
}

// Step 2: Sobre seus Eventos
function Step2Fields({ form, experience }: { form: any; experience: string }) {
	const eventTypes = form.watch('eventTypes') || [];
	const description = form.watch('description') || '';
	const goals = form.watch('goals') || '';

	return (
		<div className="space-y-8">
			{/* Seção: Tipos de Evento */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Tipos de Evento
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<FormField
					control={form.control}
					name="eventTypes"
					render={() => (
						<FormItem>
							<FormLabel className="text-base">
								Que tipos de eventos você organiza? *
							</FormLabel>
							<FormDescription>
								Selecione todos que se aplicam
							</FormDescription>
							<div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
								{EVENT_TYPES.map((type) => (
									<FormField
										key={type.value}
										control={form.control}
										name="eventTypes"
										render={({ field }) => {
											const isChecked = field.value?.includes(type.value) || false;

											return (
												<FormItem>
													<label
														className={`flex cursor-pointer items-center gap-3 rounded-lg border-2 p-4 transition-all ${
															isChecked
																? 'border-purple-600 bg-purple-50 dark:bg-purple-950/20'
																: 'border-gray-200 hover:border-gray-300 dark:border-gray-800'
														}`}
													>
														<FormControl>
															<Checkbox
																checked={isChecked}
																onCheckedChange={(checked) => {
																	const current = field.value || [];
																	field.onChange(
																		checked
																			? [...current, type.value]
																			: current.filter((v: string) => v !== type.value)
																	);
																}}
																className="size-5"
															/>
														</FormControl>
														<div className="flex-1">
															<FormLabel className="flex cursor-pointer items-center gap-2 text-base font-medium">
																<span className="text-2xl">{type.emoji}</span>
																{type.label}
															</FormLabel>
														</div>
													</label>
												</FormItem>
											);
										}}
									/>
								))}
							</div>
							<FormMessage />
						</FormItem>
					)}
				/>
			</section>

			<Separator />

			{/* Seção: Escala dos Eventos */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Escala dos Eventos
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<div className="grid gap-6 md:grid-cols-2">
					<FormField
						control={form.control}
						name="estimatedAttendees"
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="estimatedAttendees" className="text-base">
									Público estimado por evento *
								</FormLabel>
								<FormControl>
									<select
										id="estimatedAttendees"
										{...field}
										className="h-12 w-full rounded-lg border-2 border-gray-200 bg-white px-4 text-base transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-950"
									>
										<option value="">Selecione...</option>
										<option value="0-100">Até 100 pessoas</option>
										<option value="100-500">100 a 500 pessoas</option>
										<option value="500-1000">500 a 1.000 pessoas</option>
										<option value="1000-5000">1.000 a 5.000 pessoas</option>
										<option value="5000+">Mais de 5.000 pessoas</option>
									</select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="eventFrequency"
						render={({ field }) => (
							<FormItem>
								<FormLabel htmlFor="eventFrequency" className="text-base">
									Frequência de eventos *
								</FormLabel>
								<FormControl>
									<select
										id="eventFrequency"
										{...field}
										className="h-12 w-full rounded-lg border-2 border-gray-200 bg-white px-4 text-base transition-colors focus:border-purple-600 focus:ring-2 focus:ring-purple-600 focus:ring-offset-2 dark:border-gray-800 dark:bg-gray-950"
									>
										<option value="">Selecione...</option>
										<option value="weekly">Semanalmente</option>
										<option value="biweekly">Quinzenalmente</option>
										<option value="monthly">Mensalmente</option>
										<option value="quarterly">Trimestralmente</option>
										<option value="occasional">Ocasionalmente</option>
									</select>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</section>

			<Separator />

			{/* Seção: Conte mais */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<h3 className="text-lg font-semibold text-gray-900 dark:text-white">
						Conte Mais
					</h3>
					<Badge variant="secondary" className="text-xs">Obrigatório</Badge>
				</div>

				<FormField
					control={form.control}
					name="description"
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="description" className="text-base">
								Fale sobre seus eventos *
							</FormLabel>
							<FormControl>
								<div className="relative">
									<Textarea
										id="description"
										placeholder={
											experience === 'beginner'
												? 'Ex: Planejo organizar festas universitárias mensais com música ao vivo. Já tenho contato com alguns bares e estou formando uma equipe.'
												: eventTypes.includes('shows')
													? 'Ex: Festivais de música eletrônica com lineup internacional. Estrutura completa: 3 palcos, área vip, food trucks. Público médio de 3 mil pessoas.'
													: 'Fale sobre o tipo de evento, público-alvo, diferenciais, histórico e planos para os próximos meses...'
										}
										className="min-h-[150px] resize-none text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
										maxLength={500}
										{...field}
									/>
									<div className="absolute bottom-3 right-3 flex items-center gap-2">
										<span
											className={`text-xs ${
												description.length < 50
													? 'text-red-500'
													: description.length >= 500
														? 'text-orange-500'
														: 'text-gray-400'
											}`}
										>
											{description.length}/500
										</span>
									</div>
								</div>
							</FormControl>
							<FormDescription>
								{description.length < 50 ? (
									<span className="text-red-600">
										Continue escrevendo... faltam {50 - description.length} caracteres
									</span>
								) : (
									'Quanto mais detalhes, mais rápida será a análise ✓'
								)}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				{/* Dicas contextuais baseadas no tipo de evento */}
				{eventTypes.includes('shows') && (
					<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
						<Info className="size-4 text-blue-600" />
						<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
							💡 Dica: Mencione bandas/artistas que já tocaram, estrutura de palco, equipamentos de som
						</AlertDescription>
					</Alert>
				)}

				{eventTypes.includes('corporate') && (
					<Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
						<Info className="size-4 text-blue-600" />
						<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
							💡 Dica: Cite empresas atendidas (se possível), serviços oferecidos, especialidades
						</AlertDescription>
					</Alert>
				)}

				<FormField
					control={form.control}
					name="goals"
					render={({ field }) => (
						<FormItem>
							<FormLabel htmlFor="goals" className="text-base">
								Quais seus objetivos na plataforma? *
							</FormLabel>
							<FormControl>
								<div className="relative">
									<Textarea
										id="goals"
										placeholder="Ex: Profissionalizar a venda de ingressos, ter relatórios de público, facilitar check-in, aumentar a visibilidade dos eventos..."
										className="min-h-[120px] resize-none text-base focus:ring-2 focus:ring-purple-600 focus:ring-offset-2"
										maxLength={300}
										{...field}
									/>
									<div className="absolute bottom-3 right-3">
										<span
											className={`text-xs ${
												goals.length >= 300 ? 'text-orange-500' : 'text-gray-400'
											}`}
										>
											{goals.length}/300
										</span>
									</div>
								</div>
							</FormControl>
							<FormDescription>
								{goals.length < 20 ? (
									<span className="text-red-600">
										Continue escrevendo... faltam {20 - goals.length} caracteres
									</span>
								) : (
									'Ajuda nossa equipe a personalizar sua experiência ✓'
								)}
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
			</section>
		</div>
	);
}

// Step 3: Confirmação e Revisão
function Step3Review({ form }: { form: any }) {
	const values = form.getValues();

	return (
		<div className="space-y-6">
			{/* Info Box */}
			<Alert className="border-2 border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950/20">
				<Sparkles className="size-5 text-purple-600" />
				<AlertTitle className="text-purple-900 dark:text-purple-100">
					Quase lá! Revise suas informações
				</AlertTitle>
				<AlertDescription className="text-purple-700 dark:text-purple-300">
					Certifique-se de que todos os dados estão corretos. Você poderá editar depois se necessário.
				</AlertDescription>
			</Alert>

			{/* Revisão dos Dados */}
			<div className="space-y-4">
				{/* Seção 1: Identificação */}
				<ReviewCard
					title="Identificação"
					emoji="👤"
					data={{
						Organização: values.organizationName,
						Email: values.contactEmail,
						Telefone: values.phone,
						'CPF/CNPJ': values.document || 'Não informado',
						Website: values.website || 'Não informado',
						Instagram: values.instagram || 'Não informado',
						Experiência:
							values.hasExperience === 'yes'
								? 'Experiente'
								: values.hasExperience === 'some'
									? 'Alguns eventos'
									: values.hasExperience === 'beginner'
										? 'Iniciante'
										: 'Não informado'
					}}
				/>

				{/* Seção 2: Sobre os Eventos */}
				<ReviewCard
					title="Sobre os Eventos"
					emoji="🎉"
					data={{
						'Tipos de evento': (() => {
							const types = values.eventTypes || [];
							const typeLabels = types.map((t: string) => {
								const found = EVENT_TYPES.find((et) => et.value === t);
								
return found ? `${found.emoji} ${found.label}` : t;
							});
							
return typeLabels.length > 0 ? typeLabels.join(', ') : 'Nenhum selecionado';
						})(),
						'Público estimado': (() => {
							const attendees = values.estimatedAttendees;
							const labels: Record<string, string> = {
								'0-100': 'Até 100 pessoas',
								'100-500': '100 a 500 pessoas',
								'500-1000': '500 a 1.000 pessoas',
								'1000-5000': '1.000 a 5.000 pessoas',
								'5000+': 'Mais de 5.000 pessoas'
							};
							
return labels[attendees] || 'Não informado';
						})(),
						Frequência: (() => {
							const frequency = values.eventFrequency;
							const labels: Record<string, string> = {
								weekly: 'Semanalmente',
								biweekly: 'Quinzenalmente',
								monthly: 'Mensalmente',
								quarterly: 'Trimestralmente',
								occasional: 'Ocasionalmente'
							};
							
return labels[frequency] || 'Não informado';
						})()
					}}
				/>

				{/* Descrição Expandida */}
				<div className="rounded-lg border-2 border-gray-200 p-4 dark:border-gray-800">
					<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
						<span>📝</span>
						Sobre seus eventos
					</h4>
					<p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{values.description || 'Não informado'}
					</p>
				</div>

				<div className="rounded-lg border-2 border-gray-200 p-4 dark:border-gray-800">
					<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
						<span>🎯</span>
						Seus objetivos
					</h4>
					<p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
						{values.goals || 'Não informado'}
					</p>
				</div>
			</div>

			{/* What Happens Next */}
			<Alert className="border-2 border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
				<Info className="size-5 text-blue-600" />
				<AlertTitle className="text-blue-900 dark:text-blue-100">
					O que acontece depois?
				</AlertTitle>
				<AlertDescription className="text-sm text-blue-700 dark:text-blue-300">
					<ol className="mt-2 space-y-2">
						<li className="flex items-start gap-2">
							<CheckCircle2 className="size-4 flex-shrink-0 text-green-600" />
							<span>Nossa equipe analisa sua solicitação manualmente</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="size-4 flex-shrink-0 text-green-600" />
							<span>Você recebe email de aprovação em até 48 horas úteis</span>
						</li>
						<li className="flex items-start gap-2">
							<CheckCircle2 className="size-4 flex-shrink-0 text-green-600" />
							<span>Acesso liberado para criar e publicar seus eventos</span>
						</li>
					</ol>
				</AlertDescription>
			</Alert>

			{/* Termos de Uso */}
			<FormField
				control={form.control}
				name="acceptTerms"
				render={({ field }) => (
					<FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border-2 border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
						<FormControl>
							<Checkbox
								checked={field.value}
								onCheckedChange={field.onChange}
								className="mt-1 size-5"
							/>
						</FormControl>
						<div className="flex-1 space-y-1 leading-none">
							<FormLabel className="cursor-pointer text-base font-semibold">
								Aceito os termos de uso e política de privacidade *
							</FormLabel>
							<FormDescription className="text-sm">
								Li e concordo com os{' '}
								<a
									href="/termos"
									target="_blank"
									rel="noopener noreferrer"
									className="text-purple-600 underline hover:text-purple-700"
								>
									termos de uso
								</a>{' '}
								e a{' '}
								<a
									href="/privacidade"
									target="_blank"
									rel="noopener noreferrer"
									className="text-purple-600 underline hover:text-purple-700"
								>
									política de privacidade
								</a>{' '}
								da plataforma.
							</FormDescription>
						</div>
					</FormItem>
				)}
			/>

			{/* Security Note */}
			<div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm dark:border-gray-800 dark:bg-gray-900/40">
				<Lock className="size-5 flex-shrink-0 text-gray-400" />
				<p className="text-gray-600 dark:text-gray-400">
					Seus dados estão protegidos e serão usados apenas para análise da solicitação.
				</p>
			</div>
		</div>
	);
}

// Componente auxiliar: Card de revisão
function ReviewCard({
	title,
	emoji,
	data
}: {
	title: string;
	emoji: string;
	data: Record<string, string>;
}) {
	return (
		<div className="rounded-lg border-2 border-gray-200 p-4 dark:border-gray-800">
			<h4 className="mb-3 flex items-center gap-2 font-semibold text-gray-900 dark:text-white">
				<span className="text-xl">{emoji}</span>
				{title}
			</h4>
			<dl className="space-y-2">
				{Object.entries(data).map(([key, value]) => (
					<div key={key} className="flex justify-between gap-4 text-sm">
						<dt className="font-medium text-gray-600 dark:text-gray-400">{key}:</dt>
						<dd className="max-w-[60%] text-right text-gray-900 dark:text-white">{value}</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
