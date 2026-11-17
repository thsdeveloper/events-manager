import { Empty } from '@/components/ui/empty';
import { Card } from '@/components/ui/card';
import { Newspaper } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '../lib/dates';
import type { CmsPostListRow } from '../types';
import { MediaThumb } from './MediaPicker';
import { StatusBadge } from './StatusBadge';

export function PostsList({ posts }: { posts: CmsPostListRow[] }) {
	if (posts.length === 0) {
		return (
			<Empty className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-accent text-primary">
					<Newspaper className="size-6" />
				</div>
				<p className="font-medium text-foreground">Nenhum post encontrado</p>
				<p className="text-sm text-muted-foreground">Ajuste a busca ou escreva o primeiro post.</p>
				<Button asChild>
					<Link href="/super-admin/conteudo/blog/novo">Escrever post</Link>
				</Button>
			</Empty>
		);
	}

	return (
		<ul className="space-y-2">
			{posts.map((post) => (
				<li key={post.id}>
					<Card className="flex flex-wrap items-center gap-4 p-3 transition-colors hover:border-border">
						{post.image ? (
							<MediaThumb media={post.image} className="size-14 shrink-0 rounded-lg" />
						) : (
							<div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
								<Newspaper className="size-5" />
							</div>
						)}
						<div className="min-w-0 flex-1">
							<Link
								href={`/super-admin/conteudo/blog/${post.id}`}
								className="font-semibold text-foreground hover:text-primary"
							>
								{post.title}
							</Link>
							<p className="truncate text-xs text-muted-foreground">/blog/{post.slug}</p>
							{post.description && (
								<p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{post.description}</p>
							)}
						</div>
						<div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
							<StatusBadge status={post.status} publishedAt={post.published_at} />
							<span>Atualizado {formatDateTime(post.date_updated)}</span>
						</div>
						<Link
							href={`/super-admin/conteudo/blog/${post.id}`}
							className="text-sm font-semibold text-primary hover:underline"
						>
							Editar
						</Link>
					</Card>
				</li>
			))}
		</ul>
	);
}
