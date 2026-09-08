import type { AppUser, Post } from '@events-manager/contracts';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { isNotFound } from '@/lib/backend';
import { fetchPostBySlug, fetchSiteData } from '@/lib/content/fetchers';
import JsonLd from '@/lib/seo/JsonLd';
import { blogPostingJsonLd, breadcrumbJsonLd } from '@/lib/seo/json-ld';
import { buildPostMetadata, postAuthorName } from '@/lib/seo/metadata';
import { resolveSiteUrl } from '@/lib/seo/site-url';
import BlogPostClient from './BlogPostClient';

export const revalidate = 60;

interface BlogPostPageProps {
	params: Promise<{ slug: string }>;
}

async function loadPost(slug: string): Promise<{ post: Post | null; relatedPosts: Post[] }> {
	try {
		return await fetchPostBySlug(slug);
	} catch (error) {
		if (!isNotFound(error)) {
			console.error('Error loading blog post:', error);
		}

		return { post: null, relatedPosts: [] };
	}
}

export async function generateMetadata({ params }: BlogPostPageProps): Promise<Metadata> {
	const { slug } = await params;
	const [{ post }, { globals }] = await Promise.all([loadPost(slug), fetchSiteData()]);

	// 404 já nos metadados: resolvidos antes do shell, garantem o status HTTP.
	if (!post) notFound();

	return buildPostMetadata({ post, globals, siteUrl: resolveSiteUrl(globals), path: `/blog/${slug}` });
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
	const { slug } = await params;
	const [{ post, relatedPosts }, { globals }] = await Promise.all([loadPost(slug), fetchSiteData()]);

	if (!post) notFound();

	const siteUrl = resolveSiteUrl(globals);
	const author = post.author && typeof post.author === 'object' ? (post.author as AppUser) : null;

	return (
		<>
			<JsonLd
				data={[
					blogPostingJsonLd(post, siteUrl),
					breadcrumbJsonLd(
						[
							{ name: 'Início', path: '/' },
							{ name: 'Blog', path: '/blog' },
							{ name: post.title, path: `/blog/${slug}` },
						],
						siteUrl,
					),
				]}
			/>
			<BlogPostClient
				post={post}
				relatedPosts={relatedPosts}
				author={author}
				authorName={postAuthorName(author) ?? ''}
				postUrl={`${siteUrl}/blog/${slug}`}
			/>
		</>
	);
}
