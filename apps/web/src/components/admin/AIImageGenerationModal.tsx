'use client';
import { Spinner } from '@/components/ui/spinner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
export function AIImageGenerationModal({
	isOpen,
	eventTitle,
	categoryName,
}: {
	isOpen: boolean;
	eventTitle: string;
	categoryName?: string;
}) {
	return (
		<Dialog open={isOpen}>
			<DialogContent
				hideCloseButton
				onEscapeKeyDown={(event) => event.preventDefault()}
				onPointerDownOutside={(event) => event.preventDefault()}
			>
				<DialogHeader>
					<DialogTitle>Criando sua capa</DialogTitle>
					<DialogDescription>
						{eventTitle}
						{categoryName ? ` · ${categoryName}` : ''}
					</DialogDescription>
				</DialogHeader>
				<p role="status" className="flex items-center gap-3 text-sm text-muted-foreground">
					<Spinner aria-hidden="true" />
					Gerando uma imagem com base no contexto do evento. Isso pode levar alguns instantes.
				</p>
				<p className="text-sm text-muted-foreground">
					Seu cadastro está preservado. A capa aparecerá aqui quando estiver pronta.
				</p>
			</DialogContent>
		</Dialog>
	);
}
