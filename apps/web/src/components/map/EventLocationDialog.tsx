'use client';
import { useState } from 'react';
import { MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { EventLocationPicker } from './EventLocationPicker';
import type { MapPosition } from './EventLocationMap';
export function EventLocationDialog({
	position,
	address,
	onSave,
}: {
	position: MapPosition | null;
	address: string;
	onSave: (position: MapPosition | null) => void;
}) {
	const [open, setOpen] = useState(false),
		[draft, setDraft] = useState<MapPosition | null>(null);
	function start() {
		setDraft(position);
		setOpen(true);
	}

	return (
		<div className="space-y-3 rounded-xl border border-[#743DF5]/15 bg-[#F3EEFF]/50 p-4">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-start gap-3">
					<MapPin className="mt-1 size-5 text-[#743DF5]" />
					<div>
						<p className="font-medium">Ponto exato do evento</p>
						<p className="mt-1 text-sm text-muted-foreground">
							Confirme a entrada ou o ponto de encontro, mesmo que seja diferente do centro do endereço.
						</p>
					</div>
				</div>
				<Button type="button" variant="outline" onClick={start}>
					{position ? 'Ajustar localização no mapa' : 'Definir localização no mapa'}
				</Button>
			</div>
			{position && (
				<p role="status" className="flex items-center gap-2 text-sm">
					<CheckCircle2 className="size-4 text-[#743DF5]" />
					Localização salva · {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
				</p>
			)}
			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[92dvh] max-w-4xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Definir localização no mapa</DialogTitle>
						<DialogDescription>
							Busque um endereço, clique no mapa ou arraste o marcador até a entrada exata. O endereço preenchido será
							mantido.
						</DialogDescription>
					</DialogHeader>
					{open && (
						<EventLocationPicker
							position={draft}
							onPick={setDraft}
							onClear={() => setDraft(null)}
							initialQuery={address}
						/>
					)}
					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setOpen(false)}>
							Cancelar
						</Button>
						<Button
							type="button"
							disabled={!draft}
							onClick={() => {
								onSave(draft);
								setOpen(false);
							}}
						>
							Salvar localização
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
