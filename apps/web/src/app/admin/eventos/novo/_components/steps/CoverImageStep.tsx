'use client';

import { forwardRef } from 'react';
import { Wand2 } from 'lucide-react';
import ImageUpload, { type ImageUploadRef } from '@/components/admin/ImageUpload';
import type { EventWizardFormValues } from '../types';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface CoverImageStepProps {
	imageUploadRef: React.RefObject<ImageUploadRef | null>;
	onChangeCoverImage: (value: string | null) => void;
	onGenerateCoverImage: () => void;
	isGeneratingImage: boolean;
	aiError?: string | null;
}

export const CoverImageStep = forwardRef<HTMLDivElement, CoverImageStepProps>(
	({ imageUploadRef, onChangeCoverImage, onGenerateCoverImage, isGeneratingImage, aiError }, ref) => {
		const form = useFormContext<EventWizardFormValues>();
		const { toast } = useToast();

		return (
			<div ref={ref} className="space-y-8">
				<div className="rounded-xl border bg-card p-6 shadow-sm">
					<div className="flex flex-col gap-2">
						<div className="flex items-start justify-between gap-4">
							<div>
								<h2 className="text-xl font-semibold">Uma capa irresistível</h2>
								<p className="text-sm text-muted-foreground">
									A primeira impressão conta. Use uma imagem que comunique o tema e o público do evento.
								</p>
							</div>
						</div>

						<div className="mt-6 space-y-6">
							<ImageUpload
								ref={imageUploadRef}
								value={form.watch('cover_image')}
								onChange={value => {
									onChangeCoverImage(value);
									if (value) {
										form.setValue('cover_image', value, { shouldValidate: true });
									} else {
										form.setValue('cover_image', '', { shouldValidate: true });
									}
								}}
								onUploadStart={() => {
									toast({
										title: 'Enviando imagem...',
										description: 'Aguarde enquanto fazemos o upload da sua imagem.',
									});
								}}
								onUploadSuccess={(fileId) => {
									toast({
										title: 'Imagem enviada com sucesso!',
										description: 'A imagem de capa foi salva e já está disponível.',
										variant: 'success',
									});
								}}
								onUploadError={(error) => {
									toast({
										title: 'Erro ao enviar imagem',
										description: error,
										variant: 'destructive',
									});
								}}
								label="Imagem de capa (opcional)"
								description="Recomendado 1200x630px. Aceita JPG, PNG ou GIF até 5MB. O upload é feito automaticamente."
							/>

							{form.formState.errors.cover_image?.message && (
								<p className="text-sm font-medium text-destructive">{form.formState.errors.cover_image.message}</p>
							)}

							<div className="grid gap-4 rounded-lg border border-dashed p-4 text-sm text-muted-foreground md:grid-cols-2">
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
										Geramos uma capa automaticamente com base no título e na descrição do evento. Ajuste depois se quiser.
									</p>
									<Button
										type="button"
										variant="outline"
										size="sm"
										className="mt-3 border-dashed"
										onClick={onGenerateCoverImage}
										disabled={isGeneratingImage}
									>
										{isGeneratingImage ? 'Gerando...' : 'Gerar imagem com IA'}
									</Button>
									{aiError && <p className="mt-2 text-xs text-destructive">{aiError}</p>}
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	},
);

CoverImageStep.displayName = 'CoverImageStep';
