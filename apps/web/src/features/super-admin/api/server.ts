import 'server-only';
import { authenticatedBackendFetch } from '@/lib/backend-auth';
import type { EventCategoryRecord } from '@/features/super-admin/components/CategoryFormSheet';

export interface PlatformOverview {
  metrics: { organizers: number; activeOrganizers: number; events: number; publishedEvents: number; ticketsSold: number; grossRevenue: number; platformRevenue: number; providerFees: number; organizerPayable: number };
  timeline: Array<{ date: string; gross: number; tickets: number }>;
  topOrganizers: Array<{ id: string; name: string; gross: number; tickets: number; events: number }>;
  recentTransactions: any[];
  status: { organizers: Record<string, number>; events: Record<string, number> };
  provider: 'mock' | 'abacatepay';
}

export interface OrganizerList {
  data: Array<any>;
  pagination: { page: number; limit: number; total: number; pageCount: number };
}

export interface PaymentSettingsResponse { settings: Record<string, any>; runtimeProvider: 'mock' | 'abacatepay' }

export interface BrandingMedia { id: string; bucket?: string; path?: string }
export interface BrandingSettings { id: string; title: string | null; logo: BrandingMedia | null; logo_dark_mode: BrandingMedia | null }

export const fetchPlatformOverview = () => authenticatedBackendFetch<PlatformOverview>('/api/super-admin/overview');
export const fetchPlatformOrganizers = (query = '') => authenticatedBackendFetch<OrganizerList>(`/api/super-admin/organizers${query ? `?${query}` : ''}`);
export const fetchPlatformTransactions = () => authenticatedBackendFetch<{ data: any[]; pagination: any }>('/api/super-admin/finance/transactions?limit=50');
export const fetchPlatformPayouts = () => authenticatedBackendFetch<{ data: any[] }>('/api/super-admin/finance/payouts');
export const fetchPaymentSettings = () => authenticatedBackendFetch<PaymentSettingsResponse>('/api/super-admin/settings/payments');
export const fetchEventCategories = () =>
  authenticatedBackendFetch<{ data: EventCategoryRecord[] }>('/api/super-admin/categories');
export const fetchBrandingSettings = () => authenticatedBackendFetch<{ settings: BrandingSettings }>('/api/super-admin/settings/branding');

