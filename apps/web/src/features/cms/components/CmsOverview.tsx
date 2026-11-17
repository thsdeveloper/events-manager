import { Card } from '@/components/ui/card';
import { FileText, FormInput, Images, Inbox, ListTree, Newspaper, Route } from 'lucide-react';
import Link from 'next/link';
import { statusLabel } from '../lib/status';
import type { CmsOverview as CmsOverviewData } from '../types';

function OverviewMetricCard({
	title,
	href,
	icon: Icon,
	value,
	detail,
}: {
	title: string;
	href: string;
	icon: typeof FileText;
	value: number;
	detail?: React.ReactNode;
}) {
	return (
		<Link href={href} className="block">
			<Card className="h-full p-5 transition-colors hover:bg-accent/40">
				<div className="flex items-center justify-between">
					<p className="text-sm font-medium text-muted-foreground">{title}</p>
					<span className="flex size-9 items-center justify-center rounded-lg bg-accent text-primary">
						<Icon className="size-4" />
					</span>
				</div>
				<p className="mt-3 text-3xl font-bold tracking-tight">{value}</p>
				{detail && <div className="mt-2 text-xs text-muted-foreground">{detail}</div>}
			</Card>
		</Link>
	);
}

function statusBreakdown(counts: Record<'draft' | 'in_review' | 'published', number>) {
	return (
		<span className="flex flex-wrap gap-x-3 gap-y-1">
			{(['published', 'in_review', 'draft'] as const).map((status) => (
				<span key={status}>
					{counts[status] ?? 0} {statusLabel(status).toLowerCase()}
				</span>
			))}
		</span>
	);
}

export function CmsOverview({ data }: { data: CmsOverviewData }) {
	const pages = Object.values(data.pages).reduce((sum, count) => sum + count, 0);
	const posts = Object.values(data.posts).reduce((sum, count) => sum + count, 0);

	return (
		<section aria-label="Resumo do conteúdo" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
			<OverviewMetricCard
				title="Páginas"
				href="/super-admin/conteudo/paginas"
				icon={FileText}
				value={pages}
				detail={statusBreakdown(data.pages)}
			/>
			<OverviewMetricCard
				title="Posts do blog"
				href="/super-admin/conteudo/blog"
				icon={Newspaper}
				value={posts}
				detail={statusBreakdown(data.posts)}
			/>
			<OverviewMetricCard
				title="Formulários"
				href="/super-admin/conteudo/formularios"
				icon={FormInput}
				value={data.forms}
				detail={`${data.submissions} ${data.submissions === 1 ? 'resposta recebida' : 'respostas recebidas'}`}
			/>
			<OverviewMetricCard
				title="Respostas"
				href="/super-admin/conteudo/formularios"
				icon={Inbox}
				value={data.submissions}
				detail="Enviadas pelos formulários do site"
			/>
			<OverviewMetricCard
				title="Menus"
				href="/super-admin/conteudo/menus"
				icon={ListTree}
				value={data.navigations}
				detail="Navegação principal, rodapé e outros"
			/>
			<OverviewMetricCard
				title="Redirecionamentos"
				href="/super-admin/conteudo/redirecionamentos"
				icon={Route}
				value={data.redirects}
				detail="URLs antigas apontando para novas"
			/>
			<OverviewMetricCard
				title="Arquivos de mídia"
				href="/super-admin/conteudo/midia"
				icon={Images}
				value={data.media}
				detail="Imagens e PDFs da biblioteca"
			/>
		</section>
	);
}
