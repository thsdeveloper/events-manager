import type { Post } from '@events-manager/contracts';
import { ArrowLeft, ArrowRight, Newspaper } from 'lucide-react';
import Link from 'next/link';
import MediaImage from '@/components/shared/MediaImage';
import Container from '@/components/ui/container';
import { cn } from '@/lib/utils';

interface BlogIndexProps {
	posts: Post[];
	page: number;
	totalPages: number;
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
	day: 'numeric',
	month: 'long',
	year: 'numeric',
	timeZone: 'America/Sao_Paulo',
});

export function blogPageHref(page: number) {
	return page > 1 ? `/blog?page=${page}` : '/blog';
}

function PostCard({ post }: { post: Post }) {
	const published = post.published_at ? new Date(post.published_at) : null;

	return (
		<article className="group flex flex-col overflow-hidden rounded-lg border border-border bg-background transition-shadow hover:shadow-lg">
			<Link href={`/blog/${post.slug}`} className="flex h-full flex-col">
				<div className="relative h-56 w-full overflow-hidden bg-muted">
					{post.image ? (
						<MediaImage
							uuid={post.image}
							alt={post.title}
							fill
							sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
							className="object-cover transition-transform duration-300 group-hover:scale-105"
						/>
					) : (
						<div className="flex size-full items-center justify-center text-muted-foreground">
							<Newspaper aria-hidden="true" className="size-12 opacity-40" />
						</div>
					)}
				</div>
				<div className="flex flex-1 flex-col gap-3 p-5">
					{published && (
						<time
							dateTime={post.published_at ?? undefined}
							className="text-xs font-medium uppercase tracking-wide text-muted-foreground"
						>
							{dateFormatter.format(published)}
						</time>
					)}
					<h2 className="font-heading text-xl text-foreground transition-colors group-hover:text-accent">
						{post.title}
					</h2>
					{post.description && (
						<p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{post.description}</p>
					)}
				</div>
			</Link>
		</article>
	);
}

const paginationLink =
	'inline-flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent/10';

/** Índice do blog: cards paginados, renderizados no servidor (sem JavaScript no cliente). */
export default function BlogIndex({ posts, page, totalPages }: BlogIndexProps) {
	return (
		<Container className="py-12">
			<header className="mb-10 max-w-2xl">
				<p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Blog</p>
				<h1 className="mt-2 font-heading text-4xl text-foreground md:text-5xl">Novidades e bastidores</h1>
				<p className="mt-4 text-lg text-muted-foreground">
					Dicas para organizadores, novidades da plataforma e histórias de quem faz eventos acontecerem.
				</p>
			</header>

			{posts.length === 0 ? (
				<p className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">
					Ainda não há posts publicados. Volte em breve.
				</p>
			) : (
				<div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
					{posts.map((post) => (
						<PostCard key={post.id} post={post} />
					))}
				</div>
			)}

			{totalPages > 1 && (
				<nav aria-label="Paginação do blog" className="mt-12 flex items-center justify-between gap-4">
					<div>
						{page > 1 && (
							<Link href={blogPageHref(page - 1)} rel="prev" className={paginationLink}>
								<ArrowLeft aria-hidden="true" className="size-4" />
								Anterior
							</Link>
						)}
					</div>
					<p className="text-sm text-muted-foreground">
						Página {page} de {totalPages}
					</p>
					<div>
						{page < totalPages && (
							<Link href={blogPageHref(page + 1)} rel="next" className={cn(paginationLink)}>
								Próxima
								<ArrowRight aria-hidden="true" className="size-4" />
							</Link>
						)}
					</div>
				</nav>
			)}
		</Container>
	);
}
