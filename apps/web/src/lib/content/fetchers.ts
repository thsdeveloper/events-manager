import type { Event, Globals, Navigation, Page, Post, Redirect } from '@events-manager/contracts';
import { backendFetch } from '@/lib/backend';

export interface SiteData {
  globals: Globals;
  headerNavigation: Navigation;
  footerNavigation: Navigation;
}

const fallbackSiteData: SiteData = {
  globals: {
    id: 'local-fallback',
    title: 'Events Manager',
    description: 'Plataforma de gestão de eventos.',
    accent_color: '#6644ff',
  },
  headerNavigation: { id: 'main', title: 'Navegação principal', items: [] },
  footerNavigation: { id: 'footer', title: 'Rodapé', items: [] },
};

export const SITE_DATA_CACHE_TAG = 'site-settings';
/**
 * Marca toda leitura de conteúdo do CMS (páginas, posts, redirecionamentos,
 * sitemap). O painel do superadmin invalida esta tag depois de cada mudança,
 * então o site público reflete a edição sem esperar a janela de revalidação.
 */
export const CMS_CONTENT_CACHE_TAG = 'cms-content';

export async function fetchSiteData(): Promise<SiteData> {
  try {
    return await backendFetch<SiteData>('/api/content/site', { tags: [SITE_DATA_CACHE_TAG] });
  } catch (error) {
    console.warn('A API local ainda não está disponível; usando identidade visual padrão.', error);
    
return fallbackSiteData;
  }
}

export function fetchPageData(permalink: string, postPage = 1, previewToken?: string | null) {
  const query = new URLSearchParams({ permalink, page: String(postPage) });
  if (previewToken) query.set('preview', previewToken);
  // Um rascunho em preview nunca entra no cache compartilhado do site.
  const cache = previewToken ? { revalidate: 0 } : { tags: [CMS_CONTENT_CACHE_TAG] };

  return backendFetch<Page>(`/api/content/pages?${query}`, cache);
}

export function fetchEventBySlug(slug: string) {
  return backendFetch<Event>(`/api/events/slug/${encodeURIComponent(slug)}`);
}

export function fetchPostBySlug(slug: string): Promise<{ post: Post | null; relatedPosts: Post[] }> {
  return backendFetch(`/api/content/posts/${encodeURIComponent(slug)}`, { tags: [CMS_CONTENT_CACHE_TAG] });
}

export async function fetchPaginatedPosts(limit: number, page: number): Promise<Post[]> {
  const result = await backendFetch<{ data: Post[] }>(`/api/content/posts?limit=${limit}&page=${page}`, {
    tags: [CMS_CONTENT_CACHE_TAG],
  });
  
return result.data;
}

export async function fetchTotalPostCount(): Promise<number> {
  const result = await backendFetch<{ total: number }>('/api/content/posts?limit=1&page=1', {
    tags: [CMS_CONTENT_CACHE_TAG],
  });
  
return result.total;
}

export async function fetchRedirects(): Promise<Pick<Redirect, 'url_from' | 'url_to' | 'response_code'>[]> {
  try {
    return await backendFetch('/api/content/redirects', { tags: [CMS_CONTENT_CACHE_TAG] });
  } catch {
    return [];
  }
}
