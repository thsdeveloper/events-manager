'use client';

import MediaImage from '@/components/shared/MediaImage';
import BaseText from '@/components/ui/Text';
import { Separator } from '@/components/ui/separator';
import ShareDialog from '@/components/ui/ShareDialog';
import Link from 'next/link';
import Headline from '@/components/ui/Headline';
import Container from '@/components/ui/container';
import { Post, AppUser } from '@events-manager/contracts';

interface BlogPostClientProps {
	post: Post;
	relatedPosts: Post[];
	author?: AppUser | null;
	authorName: string;
	postUrl: string;
}

export default function BlogPostClient({ post, relatedPosts, author, authorName, postUrl }: BlogPostClientProps) {
	const coverImage = typeof post.image === 'object' ? post.image : null;

	return (
		<>
			<Container className="py-12">
				{post.image && (
					<div className="mb-8">
						<MediaImage
							uuid={post.image}
							alt={post.title || 'Imagem de capa do post'}
							width={coverImage?.width || 1200}
							height={coverImage?.height || 630}
							className="block h-auto w-full rounded-lg"
							sizes="(min-width: 1280px) 1216px, (min-width: 1024px) calc(100vw - 64px), (min-width: 640px) calc(100vw - 48px), calc(100vw - 32px)"
							priority
						/>
					</div>
				)}

				<Headline as="h1" headline={post.title} className="mb-4" />
				<Separator className="mb-8" />

				<div className="grid grid-cols-1 lg:grid-cols-[minmax(0,_2fr)_minmax(0,_1fr)] gap-12">
					<article className="min-w-0 text-left">
						<BaseText content={post.content || ''} />
					</article>

					<aside className="min-w-0 space-y-6 p-6 rounded-lg h-fit bg-muted text-foreground">
						{author && (
							<div className="flex items-center space-x-4">
								{author.avatar && (
									<MediaImage
										uuid={author.avatar}
										alt={authorName || 'author avatar'}
										className="rounded-full object-cover size-[48px]"
										width={48}
										height={48}
									/>
								)}
								<div>{authorName && <p className="font-semibold">{authorName}</p>}</div>
							</div>
						)}

						{post.description && <p>{post.description}</p>}

						<div className="flex justify-start">
							<ShareDialog postUrl={postUrl} postTitle={post.title} />
						</div>

						{relatedPosts.length > 0 && (
							<div>
								<Separator className="my-4" />
								<h2 className="font-semibold mb-4">Posts relacionados</h2>
								<div className="space-y-4">
									{relatedPosts.map((relatedPost) => (
										<Link
											key={relatedPost.id}
											href={`/blog/${relatedPost.slug}`}
											className="flex items-center space-x-4 hover:text-link group"
										>
											{relatedPost.image && (
												<div className="relative shrink-0 w-20 h-16 sm:w-[120px] sm:h-20 overflow-hidden rounded-lg">
													<MediaImage
														uuid={relatedPost.image}
														alt={relatedPost.title || 'related posts'}
														className="object-cover transition-transform duration-300 group-hover:scale-110"
														fill
														sizes="(max-width: 768px) 100px, (max-width: 1024px) 150px, 150px"
													/>
												</div>
											)}
											<span className="font-heading font-semibold">{relatedPost.title}</span>
										</Link>
									))}
								</div>
							</div>
						)}
					</aside>
				</div>
			</Container>
		</>
	);
}
