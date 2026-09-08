'use client';

import { cmsPostInputSchema, slugify, type CmsContentStatus, type CmsSeo } from '@events-manager/contracts';
import { ExternalLink, Save, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useId, useState } from 'react';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { revalidateCmsContent } from '../api/actions';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { formatDateTime } from '../lib/dates';
import { validateWith } from '../lib/validation';
import type { CmsMedia, CmsPostRow } from '../types';
import { Field, FieldError, SectionCard } from './FormPrimitives';
import { MediaPicker } from './MediaPicker';
import { PublishingFields } from './PublishingFields';
import { RichTextEditor } from './RichTextEditor';
import { SeoFields } from './SeoFields';
import { StatusBadge } from './StatusBadge';

interface PostEditorProps {
	/** `null` cria um post novo. */
	post: CmsPostRow | null;
	siteUrl: string;
}

export function PostEditor({ post, siteUrl }: PostEditorProps) {
	const router = useRouter();
	const { toast } = useToast();
	const id = useId();
	const [title, setTitle] = useState(post?.title ?? '');
	const [slug, setSlug] = useState(post?.slug ?? '');
	const [slugTouched, setSlugTouched] = useState(Boolean(post));
	const [description, setDescription] = useState(post?.description ?? '');
	const [content, setContent] = useState(post?.content ?? '');
	const [image, setImage] = useState<CmsMedia | null>(post?.image ?? null);
	const [status, setStatus] = useState<CmsContentStatus>(post?.status ?? 'draft');
	const [publishedAt, setPublishedAt] = useState<string | null>(post?.published_at ?? null);
	const [seo, setSeo] = useState<CmsSeo | null>(post?.seo ?? null);
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const publicUrl = `${siteUrl.replace(/\/$/, '')}/blog/${slug || 'slug'}`;

	function changeTitle(value: string) {
		setTitle(value);
		if (!slugTouched) setSlug(slugify(value));
	}

	async function save() {
		setFormError(null);
		const validation = validateWith(cmsPostInputSchema, {
			title,
			slug,
			description: description || null,
			content: content || null,
			image: image?.id ?? null,
			author: post?.author ?? null,
			status,
			published_at: publishedAt,
			seo,
		});
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			if (post) {
				await cmsRequest<CmsPostRow>(`/posts/${post.id}`, { method: 'PATCH', body: validation.data });
				await revalidateCmsContent();
				toast({ title: 'Post salvo', variant: 'success' });
				router.refresh();
			} else {
				const created = await cmsRequest<CmsPostRow>('/posts', { method: 'POST', body: validation.data });
				await revalidateCmsContent();
				toast({ title: 'Post criado', variant: 'success' });
				router.push(`/super-admin/conteudo/blog/${created.id}`);
			}
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) setErrors(failure.fieldErrors);
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	async function remove() {
		if (!post) return;
		try {
			await cmsRequest(`/posts/${post.id}`, { method: 'DELETE' });
			await revalidateCmsContent();
			toast({ title: 'Post excluído', variant: 'success' });
			router.push('/super-admin/conteudo/blog');
			router.refresh();
		} catch (failure) {
			toast({ title: 'Não foi possível excluir', description: describeError(failure), variant: 'destructive' });
		} finally {
			setDeleteOpen(false);
		}
	}

	return (
		<div className="space-y-6">
			<header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
				<div className="min-w-0">
					<p className="text-sm font-semibold text-violet-700">Blog</p>
					<h1 className="mt-1 truncate text-3xl font-bold tracking-tight">{post ? post.title : 'Novo post'}</h1>
					{post && (
						<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
							<StatusBadge status={post.status} publishedAt={post.published_at} />
							<span>Atualizado em {formatDateTime(post.date_updated ?? post.date_created)}</span>
						</div>
					)}
				</div>
				<div className="flex flex-wrap items-center gap-2">
					{post?.status === 'published' && (
						<Button variant="outline" asChild>
							<Link href={`${siteUrl.replace(/\/$/, '')}/blog/${post.slug}`} target="_blank" rel="noopener">
								<ExternalLink className="mr-2 size-4" />
								Ver no site
							</Link>
						</Button>
					)}
					<Button onClick={save} loading={saving}>
						<Save className="mr-2 size-4" />
						Salvar
					</Button>
				</div>
			</header>

			{formError && (
				<p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
					{formError}
				</p>
			)}

			<div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-6">
					<SectionCard title="Conteúdo">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id={`${id}-title`} label="Título" error={errors?.title?.[0]}>
								<Input
									id={`${id}-title`}
									value={title}
									maxLength={150}
									onChange={(event) => changeTitle(event.target.value)}
								/>
							</Field>
							<Field
								id={`${id}-slug`}
								label="Slug"
								hint={`Endereço público: /blog/${slug || '…'}`}
								error={errors?.slug?.[0]}
							>
								<Input
									id={`${id}-slug`}
									value={slug}
									maxLength={120}
									onChange={(event) => {
										setSlugTouched(true);
										setSlug(event.target.value);
									}}
								/>
							</Field>
						</div>
						<Field
							id={`${id}-description`}
							label="Resumo"
							counter={{ value: description, max: 300 }}
							error={errors?.description?.[0]}
						>
							<Textarea
								id={`${id}-description`}
								rows={3}
								maxLength={300}
								value={description}
								onChange={(event) => setDescription(event.target.value)}
							/>
						</Field>
						<div className="space-y-1.5">
							<Label>Imagem de capa</Label>
							<MediaPicker value={image} onChange={setImage} label="imagem de capa" compact />
						</div>
						<div className="space-y-1.5">
							<Label>Conteúdo</Label>
							<RichTextEditor value={content} onChange={setContent} minHeightClassName="min-h-[420px]" />
							<FieldError message={errors?.content?.[0]} />
						</div>
					</SectionCard>

					<SectionCard title="SEO" description="Como o post aparece nos buscadores e ao ser compartilhado.">
						<SeoFields
							value={seo}
							onChange={setSeo}
							url={publicUrl}
							fallbackTitle={title || 'Novo post'}
							errors={errors}
						/>
					</SectionCard>
				</div>

				<aside className="space-y-6">
					<SectionCard title="Publicação">
						<PublishingFields
							status={status}
							publishedAt={publishedAt}
							onStatusChange={setStatus}
							onPublishedAtChange={setPublishedAt}
							error={errors?.published_at?.[0]}
						/>
					</SectionCard>
					{post && (
						<SectionCard title="Zona de perigo">
							<Button
								variant="outline"
								className="w-full text-red-600 hover:text-red-700"
								onClick={() => setDeleteOpen(true)}
							>
								<Trash2 className="mr-2 size-4" />
								Excluir post
							</Button>
							<p className="text-xs text-slate-500">O post sai do blog e do sitemap imediatamente.</p>
						</SectionCard>
					)}
				</aside>
			</div>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir &ldquo;{post?.title}&rdquo;?</AlertDialogTitle>
						<AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancelar</AlertDialogCancel>
						<AlertDialogAction onClick={remove}>Excluir</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
