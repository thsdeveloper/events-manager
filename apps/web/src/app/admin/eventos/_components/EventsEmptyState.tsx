import { CalendarDays, Plus } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty';

export function EventsEmptyState() {
	return (
		<Empty className="border">
			<EmptyHeader>
				<EmptyMedia variant="icon">
					<CalendarDays aria-hidden="true" />
				</EmptyMedia>
				<EmptyTitle role="heading" aria-level={2}>
					Nenhum evento criado ainda
				</EmptyTitle>
				<EmptyDescription>Crie seu primeiro evento e acompanhe tudo por aqui.</EmptyDescription>
			</EmptyHeader>
			<EmptyContent>
				<Button asChild>
					<Link href="/admin/eventos/novo">
						<Plus />
						Criar primeiro evento
					</Link>
				</Button>
			</EmptyContent>
		</Empty>
	);
}
