import type { TicketFormData as SchemaTicketFormData } from './schemas';

export interface EventTicket {
  id: string;
  status: 'active' | 'sold_out' | 'inactive';
  title: string;
  description: string | null;
  quantity: number | null;
  quantity_sold: number | null;
  price: number | null;
  service_fee_type: 'absorbed' | 'passed_to_buyer' | null;
  buyer_price: number | null;
  sale_start_date: string | null;
  sale_end_date: string | null;
  min_quantity_per_purchase: number | null;
  max_quantity_per_purchase: number | null;
  visibility: 'public' | 'invited_only' | 'manual' | null;
  allow_installments: boolean | null;
  max_installments: number | null;
  min_amount_for_installments: number | null;
  date_created: string;
  date_updated: string;
  event_id: {
    id: string;
    title: string;
    start_date: string;
    cover_image?: {
      id: string;
    };
  };
}

export interface TicketFilters {
  search: string;
  eventIds: string[];
  status: Array<'active' | 'sold_out' | 'inactive'>;
}

export interface TicketsResponse {
  data: EventTicket[];
  meta: {
    total: number;
    page: number;
    pageCount: number;
    perPage: number;
  };
}

export type TicketFormData = SchemaTicketFormData;
