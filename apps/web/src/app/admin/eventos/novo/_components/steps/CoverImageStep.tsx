'use client';

import { Card } from '@/components/ui/card';
import { forwardRef } from 'react';
import { Wand2 } from 'lucide-react';
import ImageUpload from '@/components/admin/ImageUpload';
import type { EventWizardFormValues } from '../types';
import { useFormContext, useWatch } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CoverImageStepProps {
	onChangeCoverImage: (value: string | null) => void;
	onCoverFileSelected: (file: File | null) => void;
	pendingPreviewUrl: string | null;
	onGenerateCoverImage: () => void;
	isGeneratingImage: boolean;
	aiError?: string | null;
}

export const CoverImageStep = forwardRef<HTMLDivElement, CoverImageStepProps>(
	(
		{ onChangeCoverImage, onCoverFileSelected, pendingPreviewUrl, onGenerateCoverImage, isGeneratingImage, aiError },
		ref,
	) => {
		const form = useFormContext<EventWizardFormValues>();
		const { toast } = useToast();
		const cover = useWatch({ control: form.control, name: 'cover_image' });

		return (
			<div ref={ref} className="space-y-8">
				<Card className="p-6">
					<div className="flex flex-col gap-2">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold">Uma capa irresistível</h2>
								<p className="text-sm text-muted-foreground">
									A primeira impressão conta. Use uma imagem que comunique o tema e o público do evento.
								</p>
							</div>
						</div>

						<div className="mt-6 grid items-start gap-8 lg:grid-cols-2">
							<div className="w-full max-w-2xl">
								<ImageUpload
									uploadOnSelect={false}
									onFileSelected={onCoverFileSelected}
									pendingPreviewUrl={pendingPreviewUrl}
									value={cover}
									onChange={(value) => {
										onChangeCoverImage(value);
										if (value) {
											form.setValue('cover_image', value, { shouldValidate: true });
										} else {
											form.setValue('cover_image', '', { shouldValidate: true });
										}
									}}
									onUploadError={(error) => {
										toast({
											title: 'Erro ao enviar imagem',
											description: error,
											variant: 'destructive',
										});
									}}
									label="Imagem de capa (opcional)"
									description="Recomendado 1200x630px. Aceita JPG, PNG ou GIF até 5MB. A imagem só é enviada ao servidor quando você finalizar o cadastro do evento."
								/>
							</div>
							<div className="space-y-5">
								<FormField
									control={form.control}
									name="cover_image_alt"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Texto alternativo da capa</FormLabel>
											<FormControl>
												<Input
													{...field}
													value={field.value ?? ''}
													maxLength={240}
													placeholder="Descreva o conteúdo da imagem"
												/>
											</FormControl>
											<p className="text-xs text-muted-foreground">
												Ajuda quem usa leitor de tela a entender a imagem. Opcional.
											</p>
											<FormMessage />
										</FormItem>
									)}
								/>
								{form.formState.errors.cover_image?.message && (
									<p className="text-sm font-medium text-destructive">{form.formState.errors.cover_image.message}</p>
								)}

								<div className="space-y-5 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
									<div>
										<h3 className="font-medium text-foreground">Boas práticas</h3>
										<ul className="mt-2 list-disc space-y-1 pl-4">
											<li>Destaque o tema e o benefício principal</li>
											<li>Use pouco texto e contraste alto</li>
											<li>Mantenha rostos centralizados e com foco</li>
										</ul>
									</div>
									<div className="rounded-md bg-muted p-3">
										<p className="flex items-center gap-2 text-sm font-medium text-foreground">
											<Wand2 className="size-4" />
											Geração inteligente
										</p>
										<p className="mt-1 text-xs text-muted-foreground">
											Use o nome, a categoria, a descrição completa e as tags para criar uma capa que combine com seu
											evento.
										</p>
										<Button
											type="button"
											variant="outline"
											size="sm"
											className="mt-3"
											onClick={onGenerateCoverImage}
											disabled={isGeneratingImage}
										>
											{isGeneratingImage ? 'Gerando...' : 'Gerar imagem com IA'}
										</Button>
										{aiError && (
											<p role="alert" className="mt-2 text-xs text-destructive">
												{aiError}
											</p>
										)}
									</div>
								</div>
							</div>
						</div>
					</div>
				</Card>
			</div>
		);
	},
);

CoverImageStep.displayName = 'CoverImageStep';
