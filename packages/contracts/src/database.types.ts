export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      ai_prompts: {
        Row: {
          date_created: string
          date_updated: string
          description: string | null
          id: string
          messages: Json | null
          name: string
          sort: number | null
          status: string
          system_prompt: string | null
        }
        Insert: {
          date_created?: string
          date_updated?: string
          description?: string | null
          id?: string
          messages?: Json | null
          name: string
          sort?: number | null
          status?: string
          system_prompt?: string | null
        }
        Update: {
          date_created?: string
          date_updated?: string
          description?: string | null
          id?: string
          messages?: Json | null
          name?: string
          sort?: number | null
          status?: string
          system_prompt?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          date_created: string
          id: string
          metadata: Json
          resource_id: string | null
          resource_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          date_created?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          date_created?: string
          id?: string
          metadata?: Json
          resource_id?: string | null
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      block_button_groups: {
        Row: {
          date_created: string
          id: string
          sort: number | null
        }
        Insert: {
          date_created?: string
          id?: string
          sort?: number | null
        }
        Update: {
          date_created?: string
          id?: string
          sort?: number | null
        }
        Relationships: []
      }
      block_buttons: {
        Row: {
          button_group: string | null
          date_created: string
          id: string
          label: string | null
          page: string | null
          post: string | null
          sort: number | null
          type: string | null
          url: string | null
          variant: string | null
        }
        Insert: {
          button_group?: string | null
          date_created?: string
          id?: string
          label?: string | null
          page?: string | null
          post?: string | null
          sort?: number | null
          type?: string | null
          url?: string | null
          variant?: string | null
        }
        Update: {
          button_group?: string | null
          date_created?: string
          id?: string
          label?: string | null
          page?: string | null
          post?: string | null
          sort?: number | null
          type?: string | null
          url?: string | null
          variant?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_buttons_button_group_fkey"
            columns: ["button_group"]
            isOneToOne: false
            referencedRelation: "block_button_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_buttons_page_fkey"
            columns: ["page"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_buttons_post_fkey"
            columns: ["post"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      block_events: {
        Row: {
          description: string | null
          filter_by_category: string | null
          filter_featured: boolean
          headline: string | null
          id: string
          max_items: number
          show_past_events: boolean
        }
        Insert: {
          description?: string | null
          filter_by_category?: string | null
          filter_featured?: boolean
          headline?: string | null
          id?: string
          max_items?: number
          show_past_events?: boolean
        }
        Update: {
          description?: string | null
          filter_by_category?: string | null
          filter_featured?: boolean
          headline?: string | null
          id?: string
          max_items?: number
          show_past_events?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "block_events_category_fk"
            columns: ["filter_by_category"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      block_form: {
        Row: {
          date_created: string
          form: string | null
          headline: string | null
          id: string
          tagline: string | null
        }
        Insert: {
          date_created?: string
          form?: string | null
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Update: {
          date_created?: string
          form?: string | null
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_form_form_fkey"
            columns: ["form"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      block_gallery: {
        Row: {
          date_created: string
          headline: string | null
          id: string
          tagline: string | null
        }
        Insert: {
          date_created?: string
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Update: {
          date_created?: string
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Relationships: []
      }
      block_gallery_items: {
        Row: {
          block_gallery: string
          date_created: string
          file: string
          id: string
          sort: number | null
        }
        Insert: {
          block_gallery: string
          date_created?: string
          file: string
          id?: string
          sort?: number | null
        }
        Update: {
          block_gallery?: string
          date_created?: string
          file?: string
          id?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "block_gallery_items_block_gallery_fkey"
            columns: ["block_gallery"]
            isOneToOne: false
            referencedRelation: "block_gallery"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_gallery_items_file_fkey"
            columns: ["file"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      block_hero: {
        Row: {
          button_group: string | null
          date_created: string
          description: string | null
          headline: string | null
          id: string
          image: string | null
          layout: string | null
          tagline: string | null
        }
        Insert: {
          button_group?: string | null
          date_created?: string
          description?: string | null
          headline?: string | null
          id?: string
          image?: string | null
          layout?: string | null
          tagline?: string | null
        }
        Update: {
          button_group?: string | null
          date_created?: string
          description?: string | null
          headline?: string | null
          id?: string
          image?: string | null
          layout?: string | null
          tagline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_hero_button_group_fkey"
            columns: ["button_group"]
            isOneToOne: false
            referencedRelation: "block_button_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_hero_image_fkey"
            columns: ["image"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      block_posts: {
        Row: {
          collection: string
          date_created: string
          headline: string | null
          id: string
          limit: number
          tagline: string | null
        }
        Insert: {
          collection?: string
          date_created?: string
          headline?: string | null
          id?: string
          limit?: number
          tagline?: string | null
        }
        Update: {
          collection?: string
          date_created?: string
          headline?: string | null
          id?: string
          limit?: number
          tagline?: string | null
        }
        Relationships: []
      }
      block_pricing: {
        Row: {
          date_created: string
          headline: string | null
          id: string
          tagline: string | null
        }
        Insert: {
          date_created?: string
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Update: {
          date_created?: string
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Relationships: []
      }
      block_pricing_cards: {
        Row: {
          badge: string | null
          button: string | null
          date_created: string
          description: string | null
          features: Json | null
          id: string
          is_highlighted: boolean
          price: string | null
          pricing: string
          sort: number | null
          title: string | null
        }
        Insert: {
          badge?: string | null
          button?: string | null
          date_created?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_highlighted?: boolean
          price?: string | null
          pricing: string
          sort?: number | null
          title?: string | null
        }
        Update: {
          badge?: string | null
          button?: string | null
          date_created?: string
          description?: string | null
          features?: Json | null
          id?: string
          is_highlighted?: boolean
          price?: string | null
          pricing?: string
          sort?: number | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "block_pricing_cards_button_fkey"
            columns: ["button"]
            isOneToOne: false
            referencedRelation: "block_buttons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "block_pricing_cards_pricing_fkey"
            columns: ["pricing"]
            isOneToOne: false
            referencedRelation: "block_pricing"
            referencedColumns: ["id"]
          },
        ]
      }
      block_richtext: {
        Row: {
          alignment: string | null
          content: string | null
          date_created: string
          headline: string | null
          id: string
          tagline: string | null
        }
        Insert: {
          alignment?: string | null
          content?: string | null
          date_created?: string
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Update: {
          alignment?: string | null
          content?: string | null
          date_created?: string
          headline?: string | null
          id?: string
          tagline?: string | null
        }
        Relationships: []
      }
      email_deliveries: {
        Row: {
          attempts: number
          date_created: string
          date_updated: string
          id: string
          idempotency_key: string
          last_error: string | null
          payload: Json
          provider_message_id: string | null
          recipient: string
          status: string
          template: string
        }
        Insert: {
          attempts?: number
          date_created?: string
          date_updated?: string
          id?: string
          idempotency_key: string
          last_error?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient: string
          status?: string
          template: string
        }
        Update: {
          attempts?: number
          date_created?: string
          date_updated?: string
          id?: string
          idempotency_key?: string
          last_error?: string | null
          payload?: Json
          provider_message_id?: string | null
          recipient?: string
          status?: string
          template?: string
        }
        Relationships: []
      }
      event_categories: {
        Row: {
          color: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          slug: string
          sort: number | null
        }
        Insert: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          slug: string
          sort?: number | null
        }
        Update: {
          color?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          slug?: string
          sort?: number | null
        }
        Relationships: []
      }
      event_configurations: {
        Row: {
          allow_free_events: boolean
          boleto_fee_fixed: number
          card_fee_fixed: number
          card_fee_percentage: number
          card_installment_2_6_percentage: number
          card_installment_7_12_percentage: number
          convenience_fee_calculation_method: string
          id: number
          max_tickets_per_event: number | null
          minimum_payout: number
          payment_gateway: string
          payout_fee_fixed: number
          payouts_enabled: boolean
          pix_fee_fixed: number
          platform_fee_percentage: number
          registration_confirmation_email: boolean
          ticket_code_prefix: string
        }
        Insert: {
          allow_free_events?: boolean
          boleto_fee_fixed?: number
          card_fee_fixed?: number
          card_fee_percentage?: number
          card_installment_2_6_percentage?: number
          card_installment_7_12_percentage?: number
          convenience_fee_calculation_method?: string
          id?: number
          max_tickets_per_event?: number | null
          minimum_payout?: number
          payment_gateway?: string
          payout_fee_fixed?: number
          payouts_enabled?: boolean
          pix_fee_fixed?: number
          platform_fee_percentage?: number
          registration_confirmation_email?: boolean
          ticket_code_prefix?: string
        }
        Update: {
          allow_free_events?: boolean
          boleto_fee_fixed?: number
          card_fee_fixed?: number
          card_fee_percentage?: number
          card_installment_2_6_percentage?: number
          card_installment_7_12_percentage?: number
          convenience_fee_calculation_method?: string
          id?: number
          max_tickets_per_event?: number | null
          minimum_payout?: number
          payment_gateway?: string
          payout_fee_fixed?: number
          payouts_enabled?: boolean
          pix_fee_fixed?: number
          platform_fee_percentage?: number
          registration_confirmation_email?: boolean
          ticket_code_prefix?: string
        }
        Relationships: []
      }
      event_registrations: {
        Row: {
          additional_info: Json
          blocked_reason: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          check_in_date: string | null
          date_created: string
          date_updated: string
          event_id: string
          id: string
          installment_plan_status: string | null
          inventory_reserved: boolean
          is_installment_payment: boolean
          notes: string | null
          participant_document: string | null
          participant_email: string
          participant_name: string
          participant_phone: string | null
          payment_amount: number | null
          payment_method: string | null
          payment_provider: string
          payment_status: string | null
          platform_fee: number
          provider_checkout_id: string | null
          provider_fee: number
          provider_refund_id: string | null
          provider_transaction_id: string | null
          quantity: number
          reconciliation_checked_at: string | null
          service_fee: number | null
          sort: number | null
          status: string
          ticket_code: string | null
          ticket_type_id: string | null
          total_amount: number | null
          total_installments: number | null
          unit_price: number | null
          user_id: string | null
        }
        Insert: {
          additional_info?: Json
          blocked_reason?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          check_in_date?: string | null
          date_created?: string
          date_updated?: string
          event_id: string
          id?: string
          installment_plan_status?: string | null
          inventory_reserved?: boolean
          is_installment_payment?: boolean
          notes?: string | null
          participant_document?: string | null
          participant_email: string
          participant_name: string
          participant_phone?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_provider?: string
          payment_status?: string | null
          platform_fee?: number
          provider_checkout_id?: string | null
          provider_fee?: number
          provider_refund_id?: string | null
          provider_transaction_id?: string | null
          quantity?: number
          reconciliation_checked_at?: string | null
          service_fee?: number | null
          sort?: number | null
          status?: string
          ticket_code?: string | null
          ticket_type_id?: string | null
          total_amount?: number | null
          total_installments?: number | null
          unit_price?: number | null
          user_id?: string | null
        }
        Update: {
          additional_info?: Json
          blocked_reason?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          check_in_date?: string | null
          date_created?: string
          date_updated?: string
          event_id?: string
          id?: string
          installment_plan_status?: string | null
          inventory_reserved?: boolean
          is_installment_payment?: boolean
          notes?: string | null
          participant_document?: string | null
          participant_email?: string
          participant_name?: string
          participant_phone?: string | null
          payment_amount?: number | null
          payment_method?: string | null
          payment_provider?: string
          payment_status?: string | null
          platform_fee?: number
          provider_checkout_id?: string | null
          provider_fee?: number
          provider_refund_id?: string | null
          provider_transaction_id?: string | null
          quantity?: number
          reconciliation_checked_at?: string | null
          service_fee?: number | null
          sort?: number | null
          status?: string
          ticket_code?: string | null
          ticket_type_id?: string | null
          total_amount?: number | null
          total_installments?: number | null
          unit_price?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_registrations_ticket_type_id_fkey"
            columns: ["ticket_type_id"]
            isOneToOne: false
            referencedRelation: "event_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_tickets: {
        Row: {
          allow_installments: boolean
          buyer_price: number | null
          date_created: string
          date_updated: string
          description: string | null
          event_id: string
          id: string
          max_installments: number | null
          max_quantity_per_purchase: number
          min_amount_for_installments: number | null
          min_quantity_per_purchase: number
          price: number
          provider_product_id: string | null
          quantity: number
          quantity_sold: number
          sale_end_date: string | null
          sale_start_date: string | null
          service_fee_type: string
          sort: number | null
          status: string
          title: string
          visibility: string
        }
        Insert: {
          allow_installments?: boolean
          buyer_price?: number | null
          date_created?: string
          date_updated?: string
          description?: string | null
          event_id: string
          id?: string
          max_installments?: number | null
          max_quantity_per_purchase?: number
          min_amount_for_installments?: number | null
          min_quantity_per_purchase?: number
          price: number
          provider_product_id?: string | null
          quantity: number
          quantity_sold?: number
          sale_end_date?: string | null
          sale_start_date?: string | null
          service_fee_type: string
          sort?: number | null
          status?: string
          title: string
          visibility?: string
        }
        Update: {
          allow_installments?: boolean
          buyer_price?: number | null
          date_created?: string
          date_updated?: string
          description?: string | null
          event_id?: string
          id?: string
          max_installments?: number | null
          max_quantity_per_purchase?: number
          min_amount_for_installments?: number | null
          min_quantity_per_purchase?: number
          price?: number
          provider_product_id?: string | null
          quantity?: number
          quantity_sold?: number
          sale_end_date?: string | null
          sale_start_date?: string | null
          service_fee_type?: string
          sort?: number | null
          status?: string
          title?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_tickets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          category_id: string | null
          cover_image: string | null
          date_created: string
          date_updated: string
          description: string | null
          end_date: string
          event_type: string | null
          featured: boolean
          id: string
          is_free: boolean
          location_address: string | null
          location_name: string | null
          max_attendees: number | null
          online_url: string | null
          organizer_id: string
          registration_end: string | null
          registration_start: string | null
          short_description: string | null
          slug: string
          sort: number | null
          start_date: string
          status: string
          tags: string[]
          title: string
          user_created: string | null
          user_updated: string | null
        }
        Insert: {
          category_id?: string | null
          cover_image?: string | null
          date_created?: string
          date_updated?: string
          description?: string | null
          end_date: string
          event_type?: string | null
          featured?: boolean
          id?: string
          is_free?: boolean
          location_address?: string | null
          location_name?: string | null
          max_attendees?: number | null
          online_url?: string | null
          organizer_id: string
          registration_end?: string | null
          registration_start?: string | null
          short_description?: string | null
          slug: string
          sort?: number | null
          start_date: string
          status?: string
          tags?: string[]
          title: string
          user_created?: string | null
          user_updated?: string | null
        }
        Update: {
          category_id?: string | null
          cover_image?: string | null
          date_created?: string
          date_updated?: string
          description?: string | null
          end_date?: string
          event_type?: string | null
          featured?: boolean
          id?: string
          is_free?: boolean
          location_address?: string | null
          location_name?: string | null
          max_attendees?: number | null
          online_url?: string | null
          organizer_id?: string
          registration_end?: string | null
          registration_start?: string | null
          short_description?: string | null
          slug?: string
          sort?: number | null
          start_date?: string
          status?: string
          tags?: string[]
          title?: string
          user_created?: string | null
          user_updated?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "event_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_cover_image_fkey"
            columns: ["cover_image"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
        ]
      }
      form_fields: {
        Row: {
          choices: Json | null
          date_created: string
          form: string
          help: string | null
          id: string
          label: string | null
          name: string | null
          placeholder: string | null
          required: boolean
          sort: number | null
          type: string | null
          validation: string | null
          width: string | null
        }
        Insert: {
          choices?: Json | null
          date_created?: string
          form: string
          help?: string | null
          id?: string
          label?: string | null
          name?: string | null
          placeholder?: string | null
          required?: boolean
          sort?: number | null
          type?: string | null
          validation?: string | null
          width?: string | null
        }
        Update: {
          choices?: Json | null
          date_created?: string
          form?: string
          help?: string | null
          id?: string
          label?: string | null
          name?: string | null
          placeholder?: string | null
          required?: boolean
          sort?: number | null
          type?: string | null
          validation?: string | null
          width?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_fields_form_fkey"
            columns: ["form"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submission_values: {
        Row: {
          field: string | null
          file: string | null
          form_submission: string
          id: string
          sort: number | null
          timestamp: string
          value: string | null
        }
        Insert: {
          field?: string | null
          file?: string | null
          form_submission: string
          id?: string
          sort?: number | null
          timestamp?: string
          value?: string | null
        }
        Update: {
          field?: string | null
          file?: string | null
          form_submission?: string
          id?: string
          sort?: number | null
          timestamp?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_submission_values_field_fkey"
            columns: ["field"]
            isOneToOne: false
            referencedRelation: "form_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submission_values_file_fkey"
            columns: ["file"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "form_submission_values_form_submission_fkey"
            columns: ["form_submission"]
            isOneToOne: false
            referencedRelation: "form_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      form_submissions: {
        Row: {
          form: string
          id: string
          submitted_by: string | null
          timestamp: string
        }
        Insert: {
          form: string
          id?: string
          submitted_by?: string | null
          timestamp?: string
        }
        Update: {
          form?: string
          id?: string
          submitted_by?: string | null
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_submissions_form_fkey"
            columns: ["form"]
            isOneToOne: false
            referencedRelation: "forms"
            referencedColumns: ["id"]
          },
        ]
      }
      forms: {
        Row: {
          date_created: string
          date_updated: string
          emails: Json | null
          id: string
          is_active: boolean
          on_success: string | null
          sort: number | null
          submit_label: string | null
          success_message: string | null
          success_redirect_url: string | null
          title: string | null
        }
        Insert: {
          date_created?: string
          date_updated?: string
          emails?: Json | null
          id?: string
          is_active?: boolean
          on_success?: string | null
          sort?: number | null
          submit_label?: string | null
          success_message?: string | null
          success_redirect_url?: string | null
          title?: string | null
        }
        Update: {
          date_created?: string
          date_updated?: string
          emails?: Json | null
          id?: string
          is_active?: boolean
          on_success?: string | null
          sort?: number | null
          submit_label?: string | null
          success_message?: string | null
          success_redirect_url?: string | null
          title?: string | null
        }
        Relationships: []
      }
      media_files: {
        Row: {
          bucket: string
          date_created: string
          description: string | null
          filename: string
          filesize: number | null
          height: number | null
          id: string
          metadata: Json
          path: string
          title: string | null
          type: string | null
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          bucket?: string
          date_created?: string
          description?: string | null
          filename: string
          filesize?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          path: string
          title?: string | null
          type?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          bucket?: string
          date_created?: string
          description?: string | null
          filename?: string
          filesize?: number | null
          height?: number | null
          id?: string
          metadata?: Json
          path?: string
          title?: string | null
          type?: string | null
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: []
      }
      navigation: {
        Row: {
          date_created: string
          date_updated: string
          id: string
          is_active: boolean
          title: string | null
        }
        Insert: {
          date_created?: string
          date_updated?: string
          id: string
          is_active?: boolean
          title?: string | null
        }
        Update: {
          date_created?: string
          date_updated?: string
          id?: string
          is_active?: boolean
          title?: string | null
        }
        Relationships: []
      }
      navigation_items: {
        Row: {
          date_created: string
          date_updated: string
          id: string
          navigation: string
          page: string | null
          parent: string | null
          post: string | null
          sort: number | null
          title: string
          type: string
          url: string | null
        }
        Insert: {
          date_created?: string
          date_updated?: string
          id?: string
          navigation: string
          page?: string | null
          parent?: string | null
          post?: string | null
          sort?: number | null
          title: string
          type?: string
          url?: string | null
        }
        Update: {
          date_created?: string
          date_updated?: string
          id?: string
          navigation?: string
          page?: string | null
          parent?: string | null
          post?: string | null
          sort?: number | null
          title?: string
          type?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "navigation_items_navigation_fkey"
            columns: ["navigation"]
            isOneToOne: false
            referencedRelation: "navigation"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_page_fkey"
            columns: ["page"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_parent_fkey"
            columns: ["parent"]
            isOneToOne: false
            referencedRelation: "navigation_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "navigation_items_post_fkey"
            columns: ["post"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      organizer_payouts: {
        Row: {
          amount: number
          date_updated: string
          failure_reason: string | null
          id: string
          net_amount: number
          organizer_id: string
          pix_key: string
          pix_key_type: string
          processed_at: string | null
          processed_by: string | null
          provider: string
          provider_fee: number
          provider_payout_id: string | null
          receipt_url: string | null
          requested_at: string
          requested_by: string | null
          status: string
        }
        Insert: {
          amount: number
          date_updated?: string
          failure_reason?: string | null
          id?: string
          net_amount: number
          organizer_id: string
          pix_key: string
          pix_key_type: string
          processed_at?: string | null
          processed_by?: string | null
          provider?: string
          provider_fee?: number
          provider_payout_id?: string | null
          receipt_url?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
        }
        Update: {
          amount?: number
          date_updated?: string
          failure_reason?: string | null
          id?: string
          net_amount?: number
          organizer_id?: string
          pix_key?: string
          pix_key_type?: string
          processed_at?: string | null
          processed_by?: string | null
          provider?: string
          provider_fee?: number
          provider_payout_id?: string | null
          receipt_url?: string | null
          requested_at?: string
          requested_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizer_payouts_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "organizers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_payouts_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organizer_payouts_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizers: {
        Row: {
          date_created: string
          date_updated: string
          description: string | null
          document: string | null
          email: string
          id: string
          logo: string | null
          name: string
          payout_pix_key: string | null
          payout_pix_key_type: string | null
          payout_status: string
          phone: string | null
          sort: number | null
          status: string
          user_id: string | null
          website: string | null
        }
        Insert: {
          date_created?: string
          date_updated?: string
          description?: string | null
          document?: string | null
          email: string
          id?: string
          logo?: string | null
          name: string
          payout_pix_key?: string | null
          payout_pix_key_type?: string | null
          payout_status?: string
          phone?: string | null
          sort?: number | null
          status?: string
          user_id?: string | null
          website?: string | null
        }
        Update: {
          date_created?: string
          date_updated?: string
          description?: string | null
          document?: string | null
          email?: string
          id?: string
          logo?: string | null
          name?: string
          payout_pix_key?: string | null
          payout_pix_key_type?: string | null
          payout_status?: string
          phone?: string | null
          sort?: number | null
          status?: string
          user_id?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organizers_logo_fkey"
            columns: ["logo"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          background: string | null
          collection: string
          date_created: string
          hide_block: boolean
          id: string
          item: string
          page: string
          sort: number | null
        }
        Insert: {
          background?: string | null
          collection: string
          date_created?: string
          hide_block?: boolean
          id?: string
          item: string
          page: string
          sort?: number | null
        }
        Update: {
          background?: string | null
          collection?: string
          date_created?: string
          hide_block?: boolean
          id?: string
          item?: string
          page?: string
          sort?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_page_fkey"
            columns: ["page"]
            isOneToOne: false
            referencedRelation: "pages"
            referencedColumns: ["id"]
          },
        ]
      }
      pages: {
        Row: {
          date_created: string
          date_updated: string
          id: string
          permalink: string
          published_at: string | null
          seo: Json | null
          sort: number | null
          status: string
          title: string
        }
        Insert: {
          date_created?: string
          date_updated?: string
          id?: string
          permalink: string
          published_at?: string | null
          seo?: Json | null
          sort?: number | null
          status?: string
          title: string
        }
        Update: {
          date_created?: string
          date_updated?: string
          id?: string
          permalink?: string
          published_at?: string | null
          seo?: Json | null
          sort?: number | null
          status?: string
          title?: string
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          amount: number
          date_created: string
          date_updated: string
          due_date: string
          id: string
          installment_number: number
          paid_at: string | null
          payment_confirmed_at: string | null
          pix_copy_paste: string | null
          pix_qr_code_base64: string | null
          provider_transaction_id: string | null
          registration_id: string
          status: string
          total_installments: number
        }
        Insert: {
          amount: number
          date_created?: string
          date_updated?: string
          due_date: string
          id?: string
          installment_number: number
          paid_at?: string | null
          payment_confirmed_at?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          provider_transaction_id?: string | null
          registration_id: string
          status?: string
          total_installments: number
        }
        Update: {
          amount?: number
          date_created?: string
          date_updated?: string
          due_date?: string
          id?: string
          installment_number?: number
          paid_at?: string | null
          payment_confirmed_at?: string | null
          pix_copy_paste?: string | null
          pix_qr_code_base64?: string | null
          provider_transaction_id?: string | null
          registration_id?: string
          status?: string
          total_installments?: number
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number | null
          date_created: string
          event_type: string | null
          id: string
          metadata: Json
          organizer_net: number
          platform_fee: number
          provider: string
          provider_event_id: string | null
          provider_fee: number
          provider_object_id: string | null
          registration_id: string | null
          status: string | null
        }
        Insert: {
          amount?: number | null
          date_created?: string
          event_type?: string | null
          id?: string
          metadata?: Json
          organizer_net?: number
          platform_fee?: number
          provider?: string
          provider_event_id?: string | null
          provider_fee?: number
          provider_object_id?: string | null
          registration_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number | null
          date_created?: string
          event_type?: string | null
          id?: string
          metadata?: Json
          organizer_net?: number
          platform_fee?: number
          provider?: string
          provider_event_id?: string | null
          provider_fee?: number
          provider_object_id?: string | null
          registration_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author: string | null
          content: string | null
          date_created: string
          date_updated: string
          description: string | null
          id: string
          image: string | null
          name: string
          published_at: string | null
          seo: Json | null
          slug: string | null
          sort: number | null
          status: string
          title: string
        }
        Insert: {
          author?: string | null
          content?: string | null
          date_created?: string
          date_updated?: string
          description?: string | null
          id?: string
          image?: string | null
          name?: string
          published_at?: string | null
          seo?: Json | null
          slug?: string | null
          sort?: number | null
          status?: string
          title: string
        }
        Update: {
          author?: string | null
          content?: string | null
          date_created?: string
          date_updated?: string
          description?: string | null
          id?: string
          image?: string | null
          name?: string
          published_at?: string | null
          seo?: Json | null
          slug?: string | null
          sort?: number | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_fkey"
            columns: ["author"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_image_fkey"
            columns: ["image"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar: string | null
          date_created: string
          date_updated: string
          description: string | null
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          location: string | null
          role: string
          status: string
          title: string | null
        }
        Insert: {
          avatar?: string | null
          date_created?: string
          date_updated?: string
          description?: string | null
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          location?: string | null
          role?: string
          status?: string
          title?: string | null
        }
        Update: {
          avatar?: string | null
          date_created?: string
          date_updated?: string
          description?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          location?: string | null
          role?: string
          status?: string
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_avatar_fkey"
            columns: ["avatar"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
      redirects: {
        Row: {
          date_created: string
          date_updated: string
          id: string
          note: string | null
          response_code: string | null
          url_from: string | null
          url_to: string | null
        }
        Insert: {
          date_created?: string
          date_updated?: string
          id?: string
          note?: string | null
          response_code?: string | null
          url_from?: string | null
          url_to?: string | null
        }
        Update: {
          date_created?: string
          date_updated?: string
          id?: string
          note?: string | null
          response_code?: string | null
          url_from?: string | null
          url_to?: string | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          accent_color: string
          date_created: string
          date_updated: string
          description: string | null
          favicon: string | null
          id: string
          logo: string | null
          logo_dark_mode: string | null
          social_links: Json
          tagline: string | null
          title: string | null
          url: string | null
        }
        Insert: {
          accent_color?: string
          date_created?: string
          date_updated?: string
          description?: string | null
          favicon?: string | null
          id?: string
          logo?: string | null
          logo_dark_mode?: string | null
          social_links?: Json
          tagline?: string | null
          title?: string | null
          url?: string | null
        }
        Update: {
          accent_color?: string
          date_created?: string
          date_updated?: string
          description?: string | null
          favicon?: string | null
          id?: string
          logo?: string | null
          logo_dark_mode?: string | null
          social_links?: Json
          tagline?: string | null
          title?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "site_settings_favicon_fkey"
            columns: ["favicon"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_logo_dark_mode_fkey"
            columns: ["logo_dark_mode"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_settings_logo_fkey"
            columns: ["logo"]
            isOneToOne: false
            referencedRelation: "media_files"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organizer_profile: {
        Args: {
          target_description: string | null
          target_document: string | null
          target_email: string
          target_logo: string | null
          target_name: string
          target_phone: string | null
          target_status: string
          target_user: string
          target_website: string | null
        }
        Returns: Json
      }
      create_organizer_payout: {
        Args: {
          target_actor: string
          target_amount: number
          target_id: string
          target_organizer: string
          target_provider: string
          target_provider_fee: number
        }
        Returns: Json
      }
      get_organizer_available_balance: {
        Args: { target_organizer: string }
        Returns: number
      }
      claim_email_delivery: {
        Args: {
          target_idempotency_key: string
          target_payload: Json
          target_recipient: string
          target_template: string
        }
        Returns: Json
      }
      cancel_registration_by_organizer: {
        Args: {
          target_organizer: string
          target_reason: string
          target_registration: string
        }
        Returns: Json
      }
      consume_api_rate_limit: {
        Args: {
          target_key: string
          target_limit: number
          target_window_seconds: number
        }
        Returns: boolean
      }
      cancel_reconciled_installment: {
        Args: {
          target_charge_id: string
          target_installment_id: string
          target_provider_status: string
          target_registration_id: string
        }
        Returns: undefined
      }
      cancel_reconciled_checkout: {
        Args: {
          target_checkout_id: string
          target_provider_status: string
          target_registrations: string[]
        }
        Returns: undefined
      }
      claim_pending_checkout_reconciliations: {
        Args: { target_batch_size?: number; target_before: string }
        Returns: {
          checkout_id: string
          registration_ids: string[]
        }[]
      }
      claim_pending_installment_reconciliations: {
        Args: { target_batch_size?: number; target_before: string }
        Returns: {
          charge_id: string
          installment_id: string
          registration_id: string
        }[]
      }
      create_validated_form_submission: {
        Args: {
          target_form: string
          target_submitted_by: string | null
          target_values: Json
        }
        Returns: string
      }
      get_organizer_dashboard: {
        Args: { target_organizer: string }
        Returns: Json
      }
      list_super_admin_transactions: {
        Args: {
          target_limit: number
          target_page: number
          target_search?: string
          target_status?: string | null
        }
        Returns: Json
      }
      release_registration_inventory: {
        Args: { target_registrations: string[] }
        Returns: undefined
      }
      reserve_registration_inventory: {
        Args: { target_registrations: string[] }
        Returns: undefined
      }
      settle_reconciled_checkout: {
        Args: { target_checkout_id: string; target_registrations: string[] }
        Returns: undefined
      }
      settle_reconciled_installment: {
        Args: {
          target_charge_id: string
          target_installment_id: string
          target_registration_id: string
        }
        Returns: undefined
      }
      settle_installment_webhook: {
        Args: {
          target_charge_id: string
          target_installment_id: string
          target_metadata: Json
          target_provider_fee: number
          target_registration_id: string
        }
        Returns: undefined
      }
      increment_ticket_sales: {
        Args: { sold_amount: number; target_ticket: string }
        Returns: {
          allow_installments: boolean
          buyer_price: number | null
          date_created: string
          date_updated: string
          description: string | null
          event_id: string
          id: string
          max_installments: number | null
          max_quantity_per_purchase: number
          min_amount_for_installments: number | null
          min_quantity_per_purchase: number
          price: number
          provider_product_id: string | null
          quantity: number
          quantity_sold: number
          sale_end_date: string | null
          sale_start_date: string | null
          service_fee_type: string
          sort: number | null
          status: string
          title: string
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "event_tickets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      is_admin: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      owns_event: { Args: { target_event: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
