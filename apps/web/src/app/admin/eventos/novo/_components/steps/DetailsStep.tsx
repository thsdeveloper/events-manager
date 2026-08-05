'use client';

import { useState } from 'react';
import { Tag, Wand2, X } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { EventWizardFormValues } from '../types';

const popularTags = ['networking', 'tecnologia', 'imersão', 'carreira', 'produtividade', 'marketing'];

export function DetailsStep() {
	const form = useFormContext<EventWizardFormValues>();
	const [tagDraft, setTagDraft] = useState('');
	const tags = form.watch('tags') ?? [];

	const addTag = (newTag: string) => {
		const normalized = newTag.trim().toLowerCase();
		if (!normalized) return;
		if (tags.includes(normalized)) return;
		form.setValue('tags', [...tags, normalized], { shouldDirty: true, shouldValidate: true });
		setTagDraft('');
	};

	const removeTag = (tagToRemove: string) => {
		form.setValue(
			'tags',
			tags.filter(tag => tag !== tagToRemove),
			{ shouldDirty: true, shouldValidate: true },
		);
	};

	return (
		<div className="space-y-8">
			<div className="rounded-xl border bg-card p-6 shadow-sm">
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
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Descrição completa</FormLabel>
									<FormControl>
										<Textarea
											{...field}
											rows={6}
											placeholder="Compartilhe a programação, palestrantes, diferenciais e motivos para participar. Use uma linguagem acolhedora e clara."
										/>
									</FormControl>
									<FormMessage />
									<p className="text-xs text-muted-foreground">
										{field.value.length || 0} caracteres — recomendamos entre 150 e 500 para bons resultados.
									</p>
								</FormItem>
							)}
						/>

						<div>
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium">Tags</h3>
								<span className="text-xs text-muted-foreground">Use até 10 tags para ajudar na descoberta</span>
							</div>

							<div className="mt-3 flex gap-2">
								<Input
									value={tagDraft}
									onChange={event => setTagDraft(event.target.value)}
									onKeyDown={event => {
										if (event.key === 'Enter') {
											event.preventDefault();
											addTag(tagDraft);
										}
									}}
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
									{tags.map(tag => (
										<button
											key={tag}
											type="button"
											onClick={() => removeTag(tag)}
											className="group inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-destructive hover:bg-destructive/10 hover:text-destructive"
										>
											<Tag className="size-3" />
											<span>{tag}</span>
											<X className="size-3.5" />
										</button>
									))}
								</div>
							)}

							<div className="mt-4 flex flex-wrap gap-2">
									{popularTags.map(tag => {
										const isActive = tags.includes(tag);

										return (
										<button
											type="button"
											key={tag}
											onClick={() => addTag(tag)}
											className={cn(
												'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
												isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-dashed hover:border-primary',
											)}
										>
											#{tag}
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
