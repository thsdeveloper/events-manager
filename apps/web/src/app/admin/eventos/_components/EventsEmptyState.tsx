import { Plus } from 'lucide-react';
import Link from 'next/link';
import { Illustration } from '@/components/design-system/atoms/Illustration';
import { Button } from '@/components/ui/button';
import { Heading } from '@/components/design-system/atoms/Heading';
import { Card, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { emptyIllustrations } from '@/lib/illustrations';

/** Lista de eventos do organizador ainda vazia: convida a criar o primeiro. */
export function EventsEmptyState() {
	return (
		<Card className="grid place-items-center border-dashed py-16 text-center">
			<CardHeader className="items-center">
				<Illustration illustration={emptyIllustrations.events} className="mb-2 h-36" />
				<Heading level="h2" className="text-xl">
					Nenhum evento criado ainda
				</Heading>
				<CardDescription>Crie seu primeiro evento e acompanhe tudo por aqui.</CardDescription>
			</CardHeader>
			<CardFooter>
				<Button asChild className="gap-2">
					<Link href="/admin/eventos/novo">
						<Plus className="size-4" />
						Criar primeiro evento
					</Link>
				</Button>
			</CardFooter>
		</Card>
	);
}
