'use client';

import { Button } from '@/components/ui/button';
import {
	EVENT_PAGE_SECTION_META,
	EVENT_PAGE_SECTION_TYPES,
	type EventPageSection,
	type EventPageSectionType,
} from '@events-manager/contracts';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SECTION_ICONS } from './icons';
import { canAddSectionType } from './lib';

interface AddSectionDialogProps {
	open: boolean;
	sections: EventPageSection[];
	onPick: (type: EventPageSectionType) => void;
	onOpenChange: (open: boolean) => void;
}

export function AddSectionDialog({ open, sections, onPick, onOpenChange }: AddSectionDialogProps) {
	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl">
				<DialogHeader>
					<DialogTitle>Adicionar seção</DialogTitle>
					<DialogDescription>Escolha o que entra na página. Você organiza a ordem depois.</DialogDescription>
				</DialogHeader>
				<div className="grid gap-2 sm:grid-cols-2">
					{EVENT_PAGE_SECTION_TYPES.map((type) => {
						const meta = EVENT_PAGE_SECTION_META[type];
						const Icon = SECTION_ICONS[type];
						const allowed = canAddSectionType(type, sections);

						return (
							<Button
								variant="outline"
								key={type}
								type="button"
								disabled={!allowed}
								onClick={() => onPick(type)}
								title={allowed ? undefined : 'Esta seção só pode aparecer uma vez.'}
								className="h-auto items-start gap-3 whitespace-normal p-3 text-left"
							>
								<span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
									<Icon className="size-4" aria-hidden />
								</span>
								<span className="min-w-0">
									<span className="block text-sm font-semibold text-foreground">{meta.label}</span>
									<span className="block text-xs text-muted-foreground">{meta.description}</span>
								</span>
							</Button>
						);
					})}
				</div>
			</DialogContent>
		</Dialog>
	);
}
