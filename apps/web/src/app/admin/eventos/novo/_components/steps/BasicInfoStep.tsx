'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Info, Tag } from 'lucide-react';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { EventCategory } from '@events-manager/contracts';
import type { EventWizardFormValues } from '../types';
import { CategoryCard } from '../CategoryCard';
import { cn } from '@/lib/utils';

interface BasicInfoStepProps {
	categories: EventCategory[];
}

const MAX_TITLE_LENGTH = 100;
const MAX_SHORT_DESCRIPTION_LENGTH = 160;

export function BasicInfoStep({ categories }: BasicInfoStepProps) {
	const form = useFormContext<EventWizardFormValues>();
	const selectedCategory = form.watch('category_id');
	const titleValue = form.watch('title');
	const descriptionValue = form.watch('short_description');
	const [showPreview, setShowPreview] = useState(false);

	const handleCategorySelect = (categoryId: string) => {
		form.setValue('category_id', categoryId, { shouldValidate: true, shouldTouch: true, shouldDirty: true });
	};

	const characterProgress = (current: number, max: number) => {
		const percentage = (current / max) * 100;
		if (percentage >= 90) return 'text-destructive';
		if (percentage >= 70) return 'text-amber-600';

		return 'text-muted-foreground';
	};

	return (
		<div className="space-y-8">
			<div className="rounded-xl border bg-card p-6 shadow-sm">
				<div className="flex flex-col gap-2">
					{/* Header padrão */}
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Informações essenciais</h2>
							<p className="text-sm text-muted-foreground">
								Defina nome, categoria e descrição para atrair participantes.
							</p>
						</div>
					</div>

					{/* Conteúdo com mt-6 space-y-6 */}
					<div className="mt-6 space-y-6">
						{/* Grid 2 colunas responsivo */}
						<div className="grid gap-6 lg:grid-cols-3">
							{/* Coluna principal: Nome (destaque visual) */}
							<div className="lg:col-span-2">
								<FormField
									control={form.control}
									name="title"
									render={({ field }) => (
										<FormItem>
											<div className="flex items-center gap-2">
												<FormLabel className="text-sm font-semibold">
													Nome do evento
													<span className="ml-1 text-destructive">*</span>
												</FormLabel>
												<TooltipProvider delayDuration={200}>
													<Tooltip>
														<TooltipTrigger asChild>
															<Info className="size-3.5 cursor-help text-muted-foreground transition-colors hover:text-foreground" />
														</TooltipTrigger>
														<TooltipContent side="top" className="max-w-[280px]">
															<p className="text-xs">
																<strong>Dica:</strong> Combine <strong>tema</strong> + <strong>público-alvo</strong> +{' '}
																<strong>formato</strong>
																<br />
																<span className="text-muted-foreground">
																	Ex: "Workshop Intensivo de UX Writing para Iniciantes"
																</span>
															</p>
														</TooltipContent>
													</Tooltip>
												</TooltipProvider>
											</div>
											<FormControl>
												<Input
													{...field}
													placeholder="Ex: Imersão em Product Design 2025"
													className="text-base font-medium"
													maxLength={MAX_TITLE_LENGTH}
												/>
											</FormControl>
											<div className="flex items-center justify-between gap-2">
												<FormMessage />
												<span
													className={cn(
														'text-xs font-medium tabular-nums',
														characterProgress(field.value?.length ?? 0, MAX_TITLE_LENGTH),
													)}
												>
													{field.value?.length ?? 0}/{MAX_TITLE_LENGTH}
												</span>
											</div>
										</FormItem>
									)}
								/>
							</div>
						</div>

						{/* Categoria: grid compacto com ícones */}
						<div>
							<div className="mb-3 flex items-center gap-2">
								<Tag className="size-4 text-muted-foreground" />
								<FormLabel className="text-sm font-semibold">
									Categoria principal
									<span className="ml-1 text-destructive">*</span>
								</FormLabel>
								<span className="text-xs text-muted-foreground">• Organize seu evento no catálogo</span>
							</div>
							<div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
								{categories.length === 0 ? (
									<div className="col-span-full rounded-lg border border-dashed bg-muted/20 p-6 text-center">
										<p className="text-sm text-muted-foreground">
											Nenhuma categoria disponível. Cadastre categorias antes de criar eventos.
										</p>
									</div>
								) : (
									categories.map(category => (
										<CategoryCard
											key={category.id}
											id={String(category.id)}
											name={category.name ?? 'Sem nome'}
											description={category.description}
											icon={category.icon}
											color={category.color}
											isSelected={selectedCategory === String(category.id)}
											onSelect={handleCategorySelect}
										/>
									))
								)}
							</div>
							{form.formState.errors.category_id?.message && (
								<p className="mt-2 text-sm font-medium text-destructive">{form.formState.errors.category_id.message}</p>
							)}
						</div>

						{/* Descrição curta: otimizada para SEO */}
						<FormField
							control={form.control}
							name="short_description"
							render={({ field }) => (
								<FormItem>
									<div className="flex items-center gap-2">
										<FormLabel className="text-sm font-semibold">Descrição curta</FormLabel>
										<TooltipProvider delayDuration={200}>
											<Tooltip>
												<TooltipTrigger asChild>
													<Info className="size-3.5 cursor-help text-muted-foreground transition-colors hover:text-foreground" />
												</TooltipTrigger>
												<TooltipContent side="top" className="max-w-[300px]">
													<p className="text-xs">
														<strong>Dica SEO:</strong> Responda em 1-2 linhas:
														<br />
														• O que é o evento?
														<br />
														• Para quem é?
														<br />
														• Qual o principal benefício?
														<br />
														<span className="text-muted-foreground">
															Ex: "Aprenda UX Design do zero com cases reais e mentoria individual."
														</span>
													</p>
												</TooltipContent>
											</Tooltip>
										</TooltipProvider>
									</div>
									<FormControl>
										<Textarea
											{...field}
											rows={3}
											placeholder="Ex: Workshop prático de 4 horas com especialistas da área. Ideal para profissionais que desejam aprender técnicas avançadas."
											maxLength={MAX_SHORT_DESCRIPTION_LENGTH}
											className="resize-none"
										/>
									</FormControl>
									<div className="flex items-center justify-between gap-2">
										<FormMessage />
										<span
											className={cn(
												'text-xs font-medium tabular-nums',
												characterProgress(field.value?.length ?? 0, MAX_SHORT_DESCRIPTION_LENGTH),
											)}
										>
											{field.value?.length ?? 0}/{MAX_SHORT_DESCRIPTION_LENGTH}
										</span>
									</div>
								</FormItem>
							)}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
