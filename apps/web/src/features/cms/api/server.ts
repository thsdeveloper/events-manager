import 'server-only';
import { authenticatedBackendFetch } from '@/lib/backend-auth';
import type {
	CmsActivityEntry,
	CmsFormDetail,
	CmsFormRow,
	CmsFormSubmission,
	CmsMedia,
	CmsNavigationDetail,
	CmsNavigationRow,
	CmsOverview,
	CmsPageDetail,
	CmsPageRow,
	CmsPaginated,
	CmsPostListRow,
	CmsPostRow,
	CmsRedirectRow,
	CmsSiteSettings,
} from '../types';

const base = '/api/super-admin/cms';

function withQuery(path: string, query: Record<string, string | number | undefined>) {
	const params = new URLSearchParams();
	for (const [key, value] of Object.entries(query)) {
		if (value !== undefined && value !== '') params.set(key, String(value));
	}
	const suffix = params.toString();

	return suffix ? `${path}?${suffix}` : path;
}

export type CmsListParams = {
	page?: number;
	limit?: number;
	search?: string;
	status?: string;
};

export const fetchCmsOverview = () => authenticatedBackendFetch<CmsOverview>(`${base}/overview`);

export const fetchCmsPages = (params: CmsListParams = {}) =>
	authenticatedBackendFetch<CmsPaginated<CmsPageRow>>(withQuery(`${base}/pages`, params));
export const fetchCmsPage = (id: string) => authenticatedBackendFetch<CmsPageDetail>(`${base}/pages/${id}`);
export const fetchCmsPageActivity = (id: string) =>
	authenticatedBackendFetch<{ data: CmsActivityEntry[] }>(`${base}/pages/${id}/activity`);

export const fetchCmsPosts = (params: CmsListParams = {}) =>
	authenticatedBackendFetch<CmsPaginated<CmsPostListRow>>(withQuery(`${base}/posts`, params));
export const fetchCmsPost = (id: string) => authenticatedBackendFetch<CmsPostRow>(`${base}/posts/${id}`);

export const fetchCmsNavigations = () => authenticatedBackendFetch<{ data: CmsNavigationRow[] }>(`${base}/navigation`);
export const fetchCmsNavigation = (id: string) =>
	authenticatedBackendFetch<CmsNavigationDetail>(`${base}/navigation/${id}`);

export const fetchCmsForms = () => authenticatedBackendFetch<{ data: CmsFormRow[] }>(`${base}/forms`);
export const fetchCmsForm = (id: string) => authenticatedBackendFetch<CmsFormDetail>(`${base}/forms/${id}`);
export const fetchCmsFormSubmissions = (id: string, params: CmsListParams = {}) =>
	authenticatedBackendFetch<CmsPaginated<CmsFormSubmission>>(withQuery(`${base}/forms/${id}/submissions`, params));

export const fetchCmsRedirects = () => authenticatedBackendFetch<{ data: CmsRedirectRow[] }>(`${base}/redirects`);

export const fetchCmsMedia = (params: CmsListParams = {}) =>
	authenticatedBackendFetch<CmsPaginated<CmsMedia>>(withQuery(`${base}/media`, params));

export const fetchCmsSiteSettings = () => authenticatedBackendFetch<CmsSiteSettings>(`${base}/site`);
