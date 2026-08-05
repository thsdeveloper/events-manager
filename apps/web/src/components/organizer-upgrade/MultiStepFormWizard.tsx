'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
	Building2,
	Mail,
	Phone,
	Globe,
	FileText,
	CheckCircle2,
	ArrowRight,
	ArrowLeft,
	Save,
	Sparkles,
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

// Schema de validação
const formSchema = z.object({
	// Step 1: Informações Básicas
	organizationName: z.string().min(3, 'Nome muito curto (mínimo 3 caracteres)'),
	contactEmail: z.string().email('Email inválido'),
	phone: z.string().min(10, 'Telefone inválido (mínimo 10 dígitos)'),
	document: z.string().optional(),

	// Step 2: Presença Digital
	website: z.string().url('URL inválida').optional().or(z.literal('')),
	instagram: z.string().optional(),
	portfolio: z.string().optional(),

	// Step 3: Sobre seus Eventos
	eventTypes: z.array(z.string()).min(1, 'Selecione ao menos um tipo'),
	estimatedAttendees: z.string().min(1, 'Informe o público estimado'),
	eventFrequency: z.string().min(1, 'Informe a frequência'),
	description: z.string().min(50, 'Conte mais sobre sua operação (mínimo 50 caracteres)'),

	// Step 4: Experiência
	hasExperience: z.string(),
	goals: z.string().min(20, 'Descreva seus objetivos (mínimo 20 caracteres)'),
	howDidYouKnow: z.string(),

	// Step 5: Termos
	acceptTerms: z.boolean().refine(val => val === true, 'Você deve aceitar os termos')
});

type FormData = z.infer<typeof formSchema>;

const EVENT_TYPES = [
	'Shows e Festivais',
	'Festas e Baladas',
	'Eventos Corporativos',
	'Workshops e Cursos',
	'Esportivos',
	'Teatro e Cultura'
];

const steps = [
	{
		id: 1,
		title: 'Informações Básicas',
		icon: Building2,
		description: 'Dados principais da organização'
	},
	{
		id: 2,
		title: 'Presença Digital',
		icon: Globe,
		description: 'Redes sociais e portfolio'
	},
	{
		id: 3,
		title: 'Sobre seus Eventos',
		icon: Sparkles,
		description: 'Tipo e escala das operações'
	},
	{
		id: 4,
		title: 'Experiência',
		icon: FileText,
		description: 'Histórico e objetivos'
	},
	{
		id: 5,
		title: 'Revisão',
		icon: CheckCircle2,
		description: 'Confirmar e enviar'
	}
];

interface MultiStepFormWizardProps {
	user: {
		id: string;
		email: string | null;
		first_name: string | null;
		last_name: string | null;
	};
	onSuccess: () => void;
}

export function MultiStepFormWizard({ user, onSuccess }: MultiStepFormWizardProps) {
	const [currentStep, setCurrentStep] = useState(1);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [lastSaved, setLastSaved] = useState<Date | null>(null);
	const { toast } = useToast();

	const form = useForm<FormData>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			organizationName: user.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : '',
			contactEmail: user.email || '',
			phone: '',
			document: '',
			website: '',
			instagram: '',
			portfolio: '',
			eventTypes: [],
			estimatedAttendees: '',
			eventFrequency: '',
			description: '',
			hasExperience: '',
			goals: '',
			howDidYouKnow: '',
			acceptTerms: false
		}
	});

	// Auto-save a cada 30s
	useEffect(() => {
		const interval = setInterval(() => {
			const values = form.getValues();
			localStorage.setItem('organizer_form_draft', JSON.stringify(values));
			setLastSaved(new Date());
		}, 30000);

		return () => clearInterval(interval);
	}, [form]);

	// Carregar rascunho ao montar
	useEffect(() => {
		const draft = localStorage.getItem('organizer_form_draft');
		if (draft) {
			try {
				const parsed = JSON.parse(draft);
				form.reset(parsed);
				toast({
					title: 'Rascunho recuperado',
					description: 'Continuando de onde você parou.',
					variant: 'success',
				});
			} catch (e) {
				console.error('Error loading draft:', e);
			}
		}
	}, []);

	const nextStep = async () => {
		const fieldsToValidate = getFieldsForStep(currentStep);
		const isValid = await form.trigger(fieldsToValidate as any);

		if (isValid) {
			setCurrentStep(prev => Math.min(prev + 1, steps.length));
		}
	};

	const prevStep = () => {
		setCurrentStep(prev => Math.max(prev - 1, 1));
	};

	const getFieldsForStep = (step: number): (keyof FormData)[] => {
		switch (step) {
			case 1:
				return ['organizationName', 'contactEmail', 'phone'];
			case 2:
				return ['website', 'instagram'];
			case 3:
				return ['eventTypes', 'estimatedAttendees', 'eventFrequency', 'description'];
			case 4:
				return ['hasExperience', 'goals', 'howDidYouKnow'];
			case 5:
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
					// Adicionar outros campos conforme necessário
				}),
			});

			if (!response.ok) {
				throw new Error('Erro ao enviar solicitação');
			}

			// Limpar rascunho
			localStorage.removeItem('organizer_form_draft');

			toast({
				title: 'Solicitação enviada! 🎉',
				description: 'Vamos analisar seus dados e liberar o acesso em breve.',
				variant: 'success',
			});

			onSuccess();
		} catch (error) {
			console.error('Error:', error);
			toast({
				title: 'Erro ao enviar',
				description: 'Tente novamente mais tarde.',
				variant: 'destructive',
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const progress = (currentStep / steps.length) * 100;

	return (
		<div className="mx-auto">
			{/* Progress Bar */}
			<div className="mb-8">
				<div className="flex justify-between items-center mb-4">
					<div>
						<h3 className="text-sm font-semibold text-gray-900 dark:text-white">
							Etapa {currentStep} de {steps.length}
						</h3>
						<p className="text-xs text-gray-500">
							Tempo estimado: ~5 minutos
						</p>
					</div>
					{lastSaved && (
						<div className="flex items-center gap-2 text-xs text-gray-500">
							<Save className="size-3" />
							Salvo {lastSaved.toLocaleTimeString()}
						</div>
					)}
				</div>

				<div className="h-2 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
					<motion.div
						className="h-full bg-gradient-to-r from-purple-600 to-indigo-600"
						initial={{ width: 0 }}
						animate={{ width: `${progress}%` }}
						transition={{ duration: 0.5, ease: "easeOut" }}
					/>
				</div>

				{/* Steps Indicator */}
				<div className="mt-6 flex justify-between">
					{steps.map((step, index) => {
						const StepIcon = step.icon;
						const isCompleted = currentStep > step.id;
						const isCurrent = currentStep === step.id;

						return (
							<div
								key={step.id}
								className={`flex flex-col items-center gap-2 ${
									index < steps.length - 1 ? 'flex-1' : ''
								}`}
							>
								<motion.div
									initial={false}
									animate={{
										scale: isCurrent ? 1.1 : 1,
										backgroundColor: isCompleted
											? '#8b5cf6'
											: isCurrent
												? '#8b5cf6'
												: '#e5e7eb'
									}}
									className={`size-10 rounded-full flex items-center justify-center ${
										isCompleted || isCurrent
											? 'text-white'
											: 'text-gray-400'
									}`}
								>
									{isCompleted ? (
										<CheckCircle2 className="size-5" />
									) : (
										<StepIcon className="size-5" />
									)}
								</motion.div>
								<span className={`text-xs text-center hidden md:block ${
									isCurrent ? 'text-purple-600 font-semibold' : 'text-gray-500'
								}`}>
									{step.title}
								</span>
							</div>
						);
					})}
				</div>
			</div>

			{/* Form */}
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
						<CardContent className="space-y-6">
							<AnimatePresence mode="wait">
								<motion.div
									key={currentStep}
									initial={{ opacity: 0, x: 20 }}
									animate={{ opacity: 1, x: 0 }}
									exit={{ opacity: 0, x: -20 }}
									transition={{ duration: 0.3 }}
								>
									{currentStep === 1 && <Step1Fields form={form} />}
									{currentStep === 2 && <Step2Fields form={form} />}
									{currentStep === 3 && <Step3Fields form={form} />}
									{currentStep === 4 && <Step4Fields form={form} />}
									{currentStep === 5 && <Step5Review form={form} />}
								</motion.div>
							</AnimatePresence>
						</CardContent>
					</Card>

					{/* Navigation */}
					<div className="mt-6 flex justify-between items-center">
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
									className="gap-2"
								>
									Continuar
									<ArrowRight className="size-4" />
								</Button>
							) : (
								<Button
									type="submit"
									disabled={isSubmitting}
									className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600"
								>
									{isSubmitting ? (
										<>
											<motion.div
												animate={{ rotate: 360 }}
												transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
											>
												<Save className="size-4" />
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
	);
}

// Step Components
function Step1Fields({ form }: { form: any }) {
	return (
		<div className="space-y-4">
			<FormField
				control={form.control}
				name="organizationName"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Nome da organização ou marca *</FormLabel>
						<FormControl>
							<Input placeholder="Ex: Eventos XYZ" {...field} />
						</FormControl>
						<FormDescription>
							Como sua marca aparecerá nos eventos publicados
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid md:grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="contactEmail"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email de contato *</FormLabel>
							<FormControl>
								<div className="relative">
									<Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
									<Input className="pl-10" type="email" placeholder="contato@empresa.com" {...field} />
								</div>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>

				<FormField
					control={form.control}
					name="phone"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Telefone com DDD *</FormLabel>
							<FormControl>
								<div className="relative">
									<Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
									<Input className="pl-10" placeholder="(11) 99999-0000" {...field} />
								</div>
							</FormControl>
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
						<FormLabel>CPF ou CNPJ (opcional, mas recomendado)</FormLabel>
						<FormControl>
							<Input placeholder="000.000.000-00 ou 00.000.000/0000-00" {...field} />
						</FormControl>
						<FormDescription>
							Facilita a aprovação e futura emissão de notas fiscais
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

function Step2Fields({ form }: { form: any }) {
	return (
		<div className="space-y-4">
			<FormField
				control={form.control}
				name="website"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Site oficial</FormLabel>
						<FormControl>
							<div className="relative">
								<Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400" />
								<Input className="pl-10" placeholder="https://seusite.com" {...field} value={field.value || ''} />
							</div>
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
						<FormLabel>Instagram</FormLabel>
						<FormControl>
							<Input placeholder="@suamarca" {...field} />
						</FormControl>
						<FormDescription>
							Ajuda nossa equipe a conhecer melhor seu trabalho
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="portfolio"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Portfolio ou link para eventos anteriores</FormLabel>
						<FormControl>
							<Input placeholder="Link para fotos/vídeos dos seus eventos" {...field} />
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

function Step3Fields({ form }: { form: any }) {
	return (
		<div className="space-y-6">
			<FormField
				control={form.control}
				name="eventTypes"
				render={() => (
					<FormItem>
						<FormLabel>Tipo de eventos que você organiza *</FormLabel>
						<FormDescription>Selecione todos que se aplicam</FormDescription>
						<div className="grid grid-cols-2 gap-3 mt-3">
							{EVENT_TYPES.map((type) => (
								<FormField
									key={type}
									control={form.control}
									name="eventTypes"
									render={({ field }) => (
										<FormItem className="flex items-center space-x-2 space-y-0">
											<FormControl>
												<Checkbox
													checked={field.value?.includes(type)}
													onCheckedChange={(checked) => {
														const current = field.value || [];
														field.onChange(
															checked
																? [...current, type]
																: current.filter((t: string) => t !== type)
														);
													}}
												/>
											</FormControl>
											<FormLabel className="font-normal cursor-pointer">
												{type}
											</FormLabel>
										</FormItem>
									)}
								/>
							))}
						</div>
						<FormMessage />
					</FormItem>
				)}
			/>

			<div className="grid md:grid-cols-2 gap-4">
				<FormField
					control={form.control}
					name="estimatedAttendees"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Público estimado por evento *</FormLabel>
							<FormControl>
								<select
									{...field}
									className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-950"
								>
									<option value="">Selecione...</option>
									<option value="0-100">Até 100 pessoas</option>
									<option value="100-500">100 a 500 pessoas</option>
									<option value="500-1000">500 a 1.000 pessoas</option>
									<option value="1000+">Mais de 1.000 pessoas</option>
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
							<FormLabel>Frequência de eventos *</FormLabel>
							<FormControl>
								<select
									{...field}
									className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-950"
								>
									<option value="">Selecione...</option>
									<option value="weekly">Semanais</option>
									<option value="monthly">Mensais</option>
									<option value="quarterly">Trimestrais</option>
									<option value="occasional">Ocasionais</option>
								</select>
							</FormControl>
							<FormMessage />
						</FormItem>
					)}
				/>
			</div>

			<FormField
				control={form.control}
				name="description"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Conte mais sobre seus eventos *</FormLabel>
						<FormControl>
							<div className="relative">
								<Textarea
									placeholder="Fale sobre o tipo de evento, público-alvo, histórico e planos para os próximos meses..."
									className="min-h-[150px] resize-none"
									{...field}
									maxLength={500}
								/>
								<div className="absolute bottom-2 right-2 text-xs text-gray-400">
									{field.value?.length || 0}/500
								</div>
							</div>
						</FormControl>
						<FormDescription>
							Quanto mais detalhes, mais rápida será a análise
						</FormDescription>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

function Step4Fields({ form }: { form: any }) {
	return (
		<div className="space-y-4">
			<FormField
				control={form.control}
				name="hasExperience"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Já organizou eventos antes? *</FormLabel>
						<FormControl>
							<select
								{...field}
								className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-950"
							>
								<option value="">Selecione...</option>
								<option value="yes">Sim, sou experiente</option>
								<option value="some">Alguns eventos</option>
								<option value="beginner">Sou iniciante</option>
							</select>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="goals"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Qual seu objetivo na plataforma? *</FormLabel>
						<FormControl>
							<Textarea
								placeholder="Ex: Profissionalizar minha operação, aumentar vendas, facilitar gestão..."
								className="min-h-[100px]"
								{...field}
							/>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>

			<FormField
				control={form.control}
				name="howDidYouKnow"
				render={({ field }) => (
					<FormItem>
						<FormLabel>Como conheceu o EventsFlow?</FormLabel>
						<FormControl>
							<select
								{...field}
								className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-950"
							>
								<option value="">Selecione...</option>
								<option value="google">Google</option>
								<option value="social">Redes sociais</option>
								<option value="friend">Indicação de amigo</option>
								<option value="event">Participei de um evento</option>
								<option value="other">Outro</option>
							</select>
						</FormControl>
						<FormMessage />
					</FormItem>
				)}
			/>
		</div>
	);
}

function Step5Review({ form }: { form: any }) {
	const values = form.getValues();

	return (
		<div className="space-y-6">
			<div className="rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 p-4">
				<div className="flex items-start gap-3">
					<AlertCircle className="size-5 text-blue-600 flex-shrink-0 mt-0.5" />
					<div className="text-sm text-blue-900 dark:text-blue-100">
						<p className="font-semibold mb-1">Revise suas informações</p>
						<p className="text-blue-700 dark:text-blue-300">
							Certifique-se de que todos os dados estão corretos antes de enviar.
							Você poderá editar depois se necessário.
						</p>
					</div>
				</div>
			</div>

			<div className="space-y-4">
				<ReviewSection title="Informações Básicas" data={{
					'Organização': values.organizationName,
					'Email': values.contactEmail,
					'Telefone': values.phone,
					'CPF/CNPJ': values.document || 'Não informado'
				}} />

				<ReviewSection title="Presença Digital" data={{
					'Website': values.website || 'Não informado',
					'Instagram': values.instagram || 'Não informado',
					'Portfolio': values.portfolio || 'Não informado'
				}} />

				<ReviewSection title="Sobre os Eventos" data={{
					'Tipos': values.eventTypes?.join(', ') || 'Nenhum selecionado',
					'Público estimado': values.estimatedAttendees,
					'Frequência': values.eventFrequency,
					'Descrição': values.description
				}} />
			</div>

			<FormField
				control={form.control}
				name="acceptTerms"
				render={({ field }) => (
					<FormItem className="flex items-start space-x-3 space-y-0 rounded-lg border p-4">
						<FormControl>
							<Checkbox
								checked={field.value}
								onCheckedChange={field.onChange}
							/>
						</FormControl>
						<div className="space-y-1 leading-none">
							<FormLabel className="cursor-pointer">
								Aceito os termos de uso e política de privacidade *
							</FormLabel>
							<FormDescription>
								Li e concordo com os <a href="/termos" className="text-purple-600 hover:underline">termos de uso</a> e a <a href="/privacidade" className="text-purple-600 hover:underline">política de privacidade</a>
							</FormDescription>
						</div>
					</FormItem>
				)}
			/>
		</div>
	);
}

function ReviewSection({ title, data }: { title: string; data: Record<string, string> }) {
	return (
		<div className="border rounded-lg p-4">
			<h4 className="font-semibold text-gray-900 dark:text-white mb-3">{title}</h4>
			<dl className="space-y-2">
				{Object.entries(data).map(([key, value]) => (
					<div key={key} className="flex justify-between text-sm">
						<dt className="text-gray-600 dark:text-gray-400">{key}:</dt>
						<dd className="text-gray-900 dark:text-white font-medium text-right max-w-[60%]">
							{value}
						</dd>
					</div>
				))}
			</dl>
		</div>
	);
}
