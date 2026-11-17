'use client';

import { Card } from '@/components/ui/card';
import { useState } from 'react';
import { Tag, Wand2, X } from 'lucide-react';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormField, FormItem, FormMessage } from '@/components/ui/form';
import { htmlToPlainText } from '@/components/ui/Text';
import { RichTextEditor } from '@/features/cms/components/LazyRichTextEditor';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';

import type { EventWizardFormValues } from '../types';

import dynamic from 'next/dynamic';
const DescriptionAssistant = dynamic(
	() => import('../DescriptionAssistant').then((module) => module.DescriptionAssistant),
	{
		loading: () => (
			<p role="status" className="text-sm text-muted-foreground">
				Carregando assistente…
			</p>
		),
	},
);

const popularTags = ['networking', 'tecnologia', 'imersão', 'carreira', 'produtividade', 'marketing'];

export function DetailsStep() {
	const form = useFormContext<EventWizardFormValues>();
	const [tagDraft, setTagDraft] = useState('');
	const tags = useWatch({ control: form.control, name: 'tags' }) ?? [];
	const [assistantOpen, setAssistantOpen] = useState(false);
	const [title, category] = useWatch({ control: form.control, name: ['title', 'category_id'] });

	const addTag = (newTag: string) => {
		const normalized = newTag.trim().toLowerCase();
		if (!normalized || tags.length >= 10 || normalized.length > 24 || normalized.length < 2) return;
		if (tags.includes(normalized)) return;
		form.setValue('tags', [...tags, normalized], { shouldDirty: true, shouldValidate: true });
		setTagDraft('');
	};

	const removeTag = (tagToRemove: string) => {
		form.setValue(
			'tags',
			tags.filter((tag) => tag !== tagToRemove),
			{ shouldDirty: true, shouldValidate: true },
		);
	};

	return (
		<div className="space-y-8">
			{assistantOpen && <DescriptionAssistant onClose={() => setAssistantOpen(false)} />}
			<Card className="p-6">
				<div className="flex flex-col gap-2">
					<div className="flex items-start justify-between gap-4">
						<div>
							<h2 className="text-xl font-semibold">Conte a história do seu evento</h2>
							<p className="text-sm text-muted-foreground">
								Descreva o que acontece, para quem é e por que vale a pena participar. Use subtítulos e listas para
								facilitar a leitura.
							</p>
						</div>
						<Wand2 className="size-5 text-primary" />
					</div>

					<div className="mt-6 space-y-6">
						<Tabs defaultValue="pt">
							<TabsList aria-label="Idioma da descrição">
								<TabsTrigger value="pt">Português</TabsTrigger>
								<TabsTrigger value="en">English</TabsTrigger>
								<TabsTrigger value="es">Español</TabsTrigger>
							</TabsList>
							<TabsContent value="pt">
								<FormField
									control={form.control}
									name="description"
									render={({ field }) => (
										<FormItem>
											<div className="flex flex-wrap items-center justify-between gap-2">
												<p className="text-sm font-medium">Descrição completa</p>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={!title?.trim() || !category}
													onClick={() => setAssistantOpen(true)}
												>
													<Wand2 aria-hidden="true" />
													Criar descrição com IA
												</Button>
											</div>
											{/* Texto livre: negrito, itálico, listas e links. O HTML sai daqui e a
									    API sanitiza antes de guardar. Sem biblioteca de imagens: a capa
									    já tem o próprio campo. */}
											<RichTextEditor
												label="Descrição completa"
												value={field.value ?? ''}
												onChange={(html) => field.onChange(html)}
												allowImages={false}
												minHeightClassName="min-h-[220px]"
												placeholder="Compartilhe a programação, palestrantes, diferenciais e motivos para participar."
											/>
											<FormMessage />
											<p className="text-xs text-muted-foreground">
												{htmlToPlainText(field.value ?? '').length} caracteres — recomendamos entre 150 e 500 para bons
												resultados.
											</p>
										</FormItem>
									)}
								/>
							</TabsContent>
							{(
								[
									['en', 'description_en', 'Descrição em inglês (opcional)'],
									['es', 'description_es', 'Descrição em espanhol (opcional)'],
								] as const
							).map(([language, name, label]) => (
								<TabsContent key={name} value={language}>
									<FormField
										control={form.control}
										name={name}
										render={({ field }) => (
											<FormItem>
												<RichTextEditor
													label={label}
													value={field.value ?? ''}
													onChange={field.onChange}
													allowImages={false}
													minHeightClassName="min-h-[220px]"
													placeholder="Tradução opcional da descrição"
												/>
												<FormMessage />
											</FormItem>
										)}
									/>
								</TabsContent>
							))}
						</Tabs>
						<div>
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium">Tags</h3>
								<span className="text-xs text-muted-foreground">Use até 10 tags para ajudar na descoberta</span>
							</div>

							<div className="mt-3 flex gap-2">
								<Input
									value={tagDraft}
									onChange={(event) => setTagDraft(event.target.value)}
									onKeyDown={(event) => {
										if (event.key === 'Enter') {
											event.preventDefault();
											addTag(tagDraft);
										}
									}}
									aria-label="Nova tag"
									maxLength={24}
									disabled={tags.length >= 10}
									placeholder="Ex: ux-design"
								/>
								<Button type="button" variant="outline" onClick={() => addTag(tagDraft)}>
									Adicionar
								</Button>
							</div>

							{form.formState.errors.tags?.message && (
								<p className="mt-2 text-sm font-medium text-destructive">{form.formState.errors.tags.message}</p>
							)}

							{tags.length > 0 && (
								<div className="mt-4 flex flex-wrap gap-2">
									{tags.map((tag) => (
										<Button
											variant="secondary"
											aria-label={`Remover tag ${tag}`}
											key={tag}
											type="button"
											onClick={() => removeTag(tag)}
											className="h-auto whitespace-normal group inline-flex items-center gap-1.5 px-3 py-1.5"
										>
											<Tag className="size-3" />
											<span>{tag}</span>
											<X className="size-3.5" />
										</Button>
									))}
								</div>
							)}

							<div className="mt-4 flex flex-wrap gap-2">
								{popularTags.map((tag) => {
									const isActive = tags.includes(tag);

									return (
										<Button
											variant={isActive ? 'secondary' : 'outline'}
											type="button"
											key={tag}
											onClick={() => addTag(tag)}
											size="sm"
										>
											#{tag}
										</Button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}
