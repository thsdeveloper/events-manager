import { Empty } from '@/components/ui/empty';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FormInput } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '../lib/dates';
import type { CmsFormRow } from '../types';

export function FormsList({ forms }: { forms: CmsFormRow[] }) {
	if (forms.length === 0) {
		return (
			<Empty className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
					<FormInput className="size-6" />
				</div>
				<p className="font-medium text-foreground">Nenhum formulário</p>
				<Button asChild>
					<Link href="/super-admin/conteudo/formularios/novo">Criar formulário</Link>
				</Button>
			</Empty>
		);
	}

	return (
		<ul className="space-y-2">
			{forms.map((form) => (
				<li key={form.id}>
					<Card className="flex flex-wrap items-center gap-4 p-4 transition-colors hover:border-border">
						<span className="flex size-10 items-center justify-center rounded-lg bg-accent text-primary">
							<FormInput className="size-5" />
						</span>
						<div className="min-w-0 flex-1">
							<Link
								href={`/super-admin/conteudo/formularios/${form.id}`}
								className="font-semibold text-foreground hover:text-primary"
							>
								{form.title}
							</Link>
							<p className="text-xs text-muted-foreground">
								{form.on_success === 'redirect' ? 'Redireciona ao enviar' : 'Mostra mensagem ao enviar'} · atualizado{' '}
								{formatDateTime(form.date_updated ?? form.date_created)}
							</p>
						</div>
						<Badge variant="secondary">{form.is_active ? 'Ativo' : 'Inativo'}</Badge>
						<Link
							href={`/super-admin/conteudo/formularios/${form.id}?tab=respostas`}
							className="text-sm font-semibold text-primary hover:underline"
						>
							Respostas
						</Link>
					</Card>
				</li>
			))}
		</ul>
	);
}
