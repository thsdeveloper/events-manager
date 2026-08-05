import { fetchPostBySlug } from '@/lib/content/fetchers';
import BlogPostClient from './BlogPostClient';
import type { AppUser } from '@events-manager/contracts';

export default async function BlogPostPage({
	params,
	searchParams,
}: {
	params: Promise<{ slug: string }>;
	searchParams: Promise<{ preview?: string; token?: string }>;
}) {
	const { slug } = await params;
	const { preview, token } = await searchParams;

	const isDraft = preview === 'true' && !!token;

	try {
		const { post, relatedPosts } = await fetchPostBySlug(slug);

		if (!post) {
			return <div className="text-center text-xl mt-[20%]">404 - Post Not Found</div>;
		}

		const author = post.author as AppUser | null;
		const authorName = author ? [author.first_name, author.last_name].filter(Boolean).join(' ') : '';
		const postUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3003'}/blog/${slug}`;

		return (
			<BlogPostClient
				post={post}
				relatedPosts={relatedPosts}
				author={author}
				authorName={authorName}
				postUrl={postUrl}
				isDraft={isDraft}
			/>
		);
	} catch (error) {
		console.error('Error loading blog post:', error);

		return <div className="text-center text-xl mt-[20%]">404 - Post Not Found</div>;
	}
}
