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
			<div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-slate-50 px-6 py-12 text-center">
				<div className="flex size-12 items-center justify-center rounded-full bg-violet-100 text-violet-700">
					<Newspaper className="size-6" />
				</div>
				<p className="font-medium text-slate-950">Nenhum post encontrado</p>
				<p className="text-sm text-slate-500">Ajuste a busca ou escreva o primeiro post.</p>
				<Button asChild>
					<Link href="/super-admin/conteudo/blog/novo">Escrever post</Link>
				</Button>
			</div>
		);
	}

	return (
		<ul className="space-y-2">
			{posts.map((post) => (
				<li
					key={post.id}
					className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition-colors hover:border-violet-300"
				>
					{post.image ? (
						<MediaThumb media={post.image} className="size-14 shrink-0 rounded-lg" />
					) : (
						<div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
							<Newspaper className="size-5" />
						</div>
					)}
					<div className="min-w-0 flex-1">
						<Link
							href={`/super-admin/conteudo/blog/${post.id}`}
							className="font-semibold text-slate-950 hover:text-violet-700"
						>
							{post.title}
						</Link>
						<p className="truncate text-xs text-slate-500">/blog/{post.slug}</p>
						{post.description && <p className="mt-1 line-clamp-1 text-sm text-slate-600">{post.description}</p>}
					</div>
					<div className="flex flex-col items-end gap-1 text-xs text-slate-500">
						<StatusBadge status={post.status} publishedAt={post.published_at} />
						<span>Atualizado {formatDateTime(post.date_updated)}</span>
					</div>
					<Link
						href={`/super-admin/conteudo/blog/${post.id}`}
						className="text-sm font-semibold text-violet-700 hover:underline"
					>
						Editar
					</Link>
				</li>
			))}
		</ul>
	);
}
