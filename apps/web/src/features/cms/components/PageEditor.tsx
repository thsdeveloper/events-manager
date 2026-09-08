'use client';

import { cmsPageInputSchema, type CmsContentStatus, type CmsSeo } from '@events-manager/contracts';
import { ExternalLink, Eye, Save, Trash2 } from 'lucide-react';
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
import { useToast } from '@/hooks/use-toast';
import { revalidateCmsContent } from '../api/actions';
import { CmsRequestError, cmsRequest, describeError, type FieldErrors } from '../api/client';
import { formatDateTime } from '../lib/dates';
import { validateWith } from '../lib/validation';
import type { CmsActivityEntry, CmsPageDetail, CmsPageRow, CmsPreview } from '../types';
import { ActivityPanel } from './ActivityPanel';
import { BlockBuilder } from './BlockBuilder';
import { Field, SectionCard } from './FormPrimitives';
import { PublishingFields } from './PublishingFields';
import { SeoFields } from './SeoFields';
import { StatusBadge } from './StatusBadge';

interface PageEditorProps {
	page: CmsPageDetail;
	activity: CmsActivityEntry[];
	/** URL pública do site, para "Ver no site" e para o preview de SEO. */
	siteUrl: string;
}

export function PageEditor({ page, activity, siteUrl }: PageEditorProps) {
	const router = useRouter();
	const { toast } = useToast();
	const id = useId();
	const [title, setTitle] = useState(page.title);
	const [permalink, setPermalink] = useState(page.permalink);
	const [status, setStatus] = useState<CmsContentStatus>(page.status);
	const [publishedAt, setPublishedAt] = useState<string | null>(page.published_at);
	const [seo, setSeo] = useState<CmsSeo | null>(page.seo);
	const [errors, setErrors] = useState<FieldErrors | null>(null);
	const [formError, setFormError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [deleteOpen, setDeleteOpen] = useState(false);
	const isHome = page.permalink === '/';
	const publicUrl = `${siteUrl.replace(/\/$/, '')}${permalink === '/' ? '' : permalink}` || siteUrl;

	async function save() {
		setFormError(null);
		const validation = validateWith(cmsPageInputSchema, { title, permalink, status, published_at: publishedAt, seo });
		if (validation.errors) {
			setErrors(validation.errors);

			return;
		}
		setErrors(null);
		setSaving(true);
		try {
			await cmsRequest<CmsPageRow>(`/pages/${page.id}`, { method: 'PATCH', body: validation.data });
			await revalidateCmsContent();
			toast({ title: 'Página salva', variant: 'success' });
			router.refresh();
		} catch (failure) {
			if (failure instanceof CmsRequestError && Object.keys(failure.fieldErrors).length) setErrors(failure.fieldErrors);
			setFormError(describeError(failure));
		} finally {
			setSaving(false);
		}
	}

	async function preview() {
		try {
			const result = await cmsRequest<CmsPreview>(`/pages/${page.id}/preview`, { method: 'POST', body: {} });
			window.open(result.url, '_blank', 'noopener');
		} catch (failure) {
			toast({
				title: 'Não foi possível gerar a pré-visualização',
				description: describeError(failure),
				variant: 'destructive',
			});
		}
	}

	async function remove() {
		try {
			await cmsRequest(`/pages/${page.id}`, { method: 'DELETE' });
			await revalidateCmsContent();
			toast({ title: 'Página excluída', variant: 'success' });
			router.push('/super-admin/conteudo/paginas');
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
					<p className="text-sm font-semibold text-violet-700">Páginas</p>
					<h1 className="mt-1 truncate text-3xl font-bold tracking-tight">{page.title}</h1>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
						<StatusBadge status={page.status} publishedAt={page.published_at} />
						<span>Atualizada em {formatDateTime(page.date_updated ?? page.date_created)}</span>
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<Button variant="outline" onClick={preview}>
						<Eye className="mr-2 size-4" />
						Pré-visualizar
					</Button>
					{page.status === 'published' && (
						<Button variant="outline" asChild>
							<Link href={publicUrl} target="_blank" rel="noopener">
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
					<SectionCard title="Conteúdo" description="Título, endereço e os blocos que compõem a página.">
						<div className="grid gap-4 sm:grid-cols-2">
							<Field id={`${id}-title`} label="Título" error={errors?.title?.[0]}>
								<Input
									id={`${id}-title`}
									value={title}
									maxLength={150}
									onChange={(event) => setTitle(event.target.value)}
								/>
							</Field>
							<Field
								id={`${id}-permalink`}
								label="Permalink"
								hint={isHome ? 'A página inicial responde na raiz do site.' : 'Caminho público, ex.: /sobre-nos'}
								error={errors?.permalink?.[0]}
							>
								<Input
									id={`${id}-permalink`}
									value={permalink}
									disabled={isHome}
									onChange={(event) => setPermalink(event.target.value)}
								/>
							</Field>
						</div>
						<BlockBuilder pageId={page.id} blocks={page.blocks} />
					</SectionCard>

					<SectionCard title="SEO" description="Como a página aparece nos buscadores e ao ser compartilhada.">
						<SeoFields value={seo} onChange={setSeo} url={publicUrl} fallbackTitle={title} errors={errors} />
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

					<SectionCard title="Atividade" description="Quem mexeu nesta página e quando.">
						<ActivityPanel entries={activity} />
					</SectionCard>

					<SectionCard title="Zona de perigo">
						<Button
							variant="outline"
							className="w-full text-red-600 hover:text-red-700"
							disabled={isHome}
							onClick={() => setDeleteOpen(true)}
						>
							<Trash2 className="mr-2 size-4" />
							Excluir página
						</Button>
						<p className="text-xs text-slate-500">
							{isHome
								? 'A página inicial não pode ser excluída: ela responde na raiz do site. Edite os blocos ou deixe-a como rascunho.'
								: 'Os blocos são apagados junto. Links de menu que apontam para ela ficam sem destino.'}
						</p>
					</SectionCard>
				</aside>
			</div>

			<AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Excluir &ldquo;{page.title}&rdquo;?</AlertDialogTitle>
						<AlertDialogDescription>
							A página e todos os seus blocos deixam de existir. Quem acessar {publicUrl} verá a página de não
							encontrado, a menos que você crie um redirecionamento.
						</AlertDialogDescription>
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
