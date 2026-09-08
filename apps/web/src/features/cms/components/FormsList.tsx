import { FormInput } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '../lib/dates';
import type { CmsFormRow } from '../types';

export function FormsList({ forms }: { forms: CmsFormRow[] }) {
	if (forms.length === 0) {
		return (
			<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
					<FormInput className="size-6" />
				</div>
				<p className="font-medium text-slate-950">Nenhum formulário</p>
				<Button asChild>
					<Link href="/super-admin/conteudo/formularios/novo">Criar formulário</Link>
				</Button>
			</div>
		);
	}

	return (
		<ul className="space-y-2">
			{forms.map((form) => (
				<li
					key={form.id}
					className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-violet-300"
				>
					<span className="flex size-10 items-center justify-center rounded-lg bg-violet-50 text-violet-700">
						<FormInput className="size-5" />
					</span>
					<div className="min-w-0 flex-1">
						<Link
							href={`/super-admin/conteudo/formularios/${form.id}`}
							className="font-semibold text-slate-950 hover:text-violet-700"
						>
							{form.title}
						</Link>
						<p className="text-xs text-slate-500">
							{form.on_success === 'redirect' ? 'Redireciona ao enviar' : 'Mostra mensagem ao enviar'} · atualizado{' '}
							{formatDateTime(form.date_updated ?? form.date_created)}
						</p>
					</div>
					<span
						className={`rounded-full px-2.5 py-1 text-xs font-semibold ${form.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
					>
						{form.is_active ? 'Ativo' : 'Inativo'}
					</span>
					<Link
						href={`/super-admin/conteudo/formularios/${form.id}?tab=respostas`}
						className="text-sm font-semibold text-violet-700 hover:underline"
					>
						Respostas
					</Link>
				</li>
			))}
		</ul>
	);
}
