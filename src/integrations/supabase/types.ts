export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      contract_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          contract_id: string
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          contract_id: string
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          contract_id?: string
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_events_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "partner_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_number_counters: {
        Row: {
          last_value: number
          year: number
        }
        Insert: {
          last_value?: number
          year: number
        }
        Update: {
          last_value?: number
          year?: number
        }
        Relationships: []
      }
      deliveries: {
        Row: {
          courier_lat: number | null
          courier_lng: number | null
          courier_name: string | null
          courier_phone: string | null
          created_at: string
          delivered_at: string | null
          dropoff_address: string | null
          dropoff_lat: number | null
          dropoff_lng: number | null
          estimated_delivery_at: string | null
          estimated_pickup_at: string | null
          fee: number
          id: string
          notes: string | null
          order_id: string
          paid_by: Database["public"]["Enums"]["delivery_fee_payer"]
          picked_up_at: string | null
          pickup_address: string | null
          pickup_lat: number | null
          pickup_lng: number | null
          provider: Database["public"]["Enums"]["delivery_provider"]
          provider_delivery_id: string | null
          provider_payload: Json | null
          status: Database["public"]["Enums"]["delivery_status"]
          store_id: string
          updated_at: string
        }
        Insert: {
          courier_lat?: number | null
          courier_lng?: number | null
          courier_name?: string | null
          courier_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_delivery_at?: string | null
          estimated_pickup_at?: string | null
          fee?: number
          id?: string
          notes?: string | null
          order_id: string
          paid_by?: Database["public"]["Enums"]["delivery_fee_payer"]
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          provider?: Database["public"]["Enums"]["delivery_provider"]
          provider_delivery_id?: string | null
          provider_payload?: Json | null
          status?: Database["public"]["Enums"]["delivery_status"]
          store_id: string
          updated_at?: string
        }
        Update: {
          courier_lat?: number | null
          courier_lng?: number | null
          courier_name?: string | null
          courier_phone?: string | null
          created_at?: string
          delivered_at?: string | null
          dropoff_address?: string | null
          dropoff_lat?: number | null
          dropoff_lng?: number | null
          estimated_delivery_at?: string | null
          estimated_pickup_at?: string | null
          fee?: number
          id?: string
          notes?: string | null
          order_id?: string
          paid_by?: Database["public"]["Enums"]["delivery_fee_payer"]
          picked_up_at?: string | null
          pickup_address?: string | null
          pickup_lat?: number | null
          pickup_lng?: number | null
          provider?: Database["public"]["Enums"]["delivery_provider"]
          provider_delivery_id?: string | null
          provider_payload?: Json | null
          status?: Database["public"]["Enums"]["delivery_status"]
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deliveries_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deliveries_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          allergens: string[] | null
          available_date: string
          category: string
          created_at: string
          delivery_available: boolean
          description: string | null
          description_en: string | null
          description_fa: string | null
          description_ru: string | null
          description_tr: string | null
          discounted_price: number
          id: string
          image_path: string | null
          image_signed_url_expires_at: string | null
          image_url: string | null
          is_active: boolean
          is_surprise: boolean
          original_price: number
          pickup_available: boolean
          pickup_from: string
          pickup_to: string
          quantity_available: number
          quantity_sold: number
          store_id: string
          title: string
          title_en: string | null
          title_fa: string | null
          title_ru: string | null
          title_tr: string | null
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          available_date?: string
          category?: string
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          description_en?: string | null
          description_fa?: string | null
          description_ru?: string | null
          description_tr?: string | null
          discounted_price: number
          id?: string
          image_path?: string | null
          image_signed_url_expires_at?: string | null
          image_url?: string | null
          is_active?: boolean
          is_surprise?: boolean
          original_price: number
          pickup_available?: boolean
          pickup_from?: string
          pickup_to?: string
          quantity_available?: number
          quantity_sold?: number
          store_id: string
          title: string
          title_en?: string | null
          title_fa?: string | null
          title_ru?: string | null
          title_tr?: string | null
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          available_date?: string
          category?: string
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          description_en?: string | null
          description_fa?: string | null
          description_ru?: string | null
          description_tr?: string | null
          discounted_price?: number
          id?: string
          image_path?: string | null
          image_signed_url_expires_at?: string | null
          image_url?: string | null
          is_active?: boolean
          is_surprise?: boolean
          original_price?: number
          pickup_available?: boolean
          pickup_from?: string
          pickup_to?: string
          quantity_available?: number
          quantity_sold?: number
          store_id?: string
          title?: string
          title_en?: string | null
          title_fa?: string | null
          title_ru?: string | null
          title_tr?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          order_id: string
          status: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id: string
          status: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          order_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount: number
          code: string
          collected_at: string | null
          created_at: string
          customer_note: string | null
          delivery_address: string | null
          delivery_details: string | null
          delivery_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          delivery_place_id: string | null
          gifted_to: string | null
          id: string
          method: Database["public"]["Enums"]["order_method"]
          notes: string | null
          offer_id: string
          original_price_at_purchase: number | null
          payment_provider: string
          payout_id: string | null
          quantity: number
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          code?: string
          collected_at?: string | null
          created_at?: string
          customer_note?: string | null
          delivery_address?: string | null
          delivery_details?: string | null
          delivery_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_place_id?: string | null
          gifted_to?: string | null
          id?: string
          method?: Database["public"]["Enums"]["order_method"]
          notes?: string | null
          offer_id: string
          original_price_at_purchase?: number | null
          payment_provider?: string
          payout_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          code?: string
          collected_at?: string | null
          created_at?: string
          customer_note?: string | null
          delivery_address?: string | null
          delivery_details?: string | null
          delivery_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          delivery_place_id?: string | null
          gifted_to?: string | null
          id?: string
          method?: Database["public"]["Enums"]["order_method"]
          notes?: string | null
          offer_id?: string
          original_price_at_purchase?: number | null
          payment_provider?: string
          payout_id?: string | null
          quantity?: number
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_contracts: {
        Row: {
          contract_number: string
          created_at: string
          id: string
          pdf_storage_path: string | null
          placeholder_values: Json
          signature_image_path: string | null
          signed_at: string | null
          signed_ip: string | null
          status: string
          store_id: string
          updated_at: string
          version: number
        }
        Insert: {
          contract_number: string
          created_at?: string
          id?: string
          pdf_storage_path?: string | null
          placeholder_values?: Json
          signature_image_path?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          status?: string
          store_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          contract_number?: string
          created_at?: string
          id?: string
          pdf_storage_path?: string | null
          placeholder_values?: Json
          signature_image_path?: string | null
          signed_at?: string | null
          signed_ip?: string | null
          status?: string
          store_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "partner_contracts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_verification_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          store_id: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          store_id: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_verification_events_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          commission_amount: number
          created_at: string
          generated_by: string
          gross_amount: number
          id: string
          order_count: number
          paid_at: string | null
          period_end: string | null
          period_start: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          commission_amount?: number
          created_at?: string
          generated_by?: string
          gross_amount?: number
          id?: string
          order_count?: number
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          commission_amount?: number
          created_at?: string
          generated_by?: string
          gross_amount?: number
          id?: string
          order_count?: number
          paid_at?: string | null
          period_end?: string | null
          period_start?: string | null
          status?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          commission_percentage: number
          created_at: string
          cure_period_days: number
          id: boolean
          liability_cap_multiplier: number
          termination_notice_days: number
          updated_at: string
        }
        Insert: {
          commission_percentage?: number
          created_at?: string
          cure_period_days?: number
          id?: boolean
          liability_cap_multiplier?: number
          termination_notice_days?: number
          updated_at?: string
        }
        Update: {
          commission_percentage?: number
          created_at?: string
          cure_period_days?: number
          id?: boolean
          liability_cap_multiplier?: number
          termination_notice_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          district: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          district?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          active: boolean
          badge_en: string | null
          badge_fa: string | null
          badge_ka: string | null
          badge_ru: string | null
          badge_tr: string | null
          button_en: string | null
          button_fa: string | null
          button_ka: string
          button_ru: string | null
          button_tr: string | null
          created_at: string
          headline_en: string | null
          headline_fa: string | null
          headline_ka: string
          headline_ru: string | null
          headline_tr: string | null
          id: string
          image_path: string | null
          image_url: string | null
          link_search: Json | null
          link_to: string
          overlay_class: string | null
          position: number
          subtext_en: string | null
          subtext_fa: string | null
          subtext_ka: string
          subtext_ru: string | null
          subtext_tr: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_en?: string | null
          badge_fa?: string | null
          badge_ka?: string | null
          badge_ru?: string | null
          badge_tr?: string | null
          button_en?: string | null
          button_fa?: string | null
          button_ka?: string
          button_ru?: string | null
          button_tr?: string | null
          created_at?: string
          headline_en?: string | null
          headline_fa?: string | null
          headline_ka: string
          headline_ru?: string | null
          headline_tr?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          link_search?: Json | null
          link_to?: string
          overlay_class?: string | null
          position?: number
          subtext_en?: string | null
          subtext_fa?: string | null
          subtext_ka?: string
          subtext_ru?: string | null
          subtext_tr?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_en?: string | null
          badge_fa?: string | null
          badge_ka?: string | null
          badge_ru?: string | null
          badge_tr?: string | null
          button_en?: string | null
          button_fa?: string | null
          button_ka?: string
          button_ru?: string | null
          button_tr?: string | null
          created_at?: string
          headline_en?: string | null
          headline_fa?: string | null
          headline_ka?: string
          headline_ru?: string | null
          headline_tr?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          link_search?: Json | null
          link_to?: string
          overlay_class?: string | null
          position?: number
          subtext_en?: string | null
          subtext_fa?: string | null
          subtext_ka?: string
          subtext_ru?: string | null
          subtext_tr?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      saved_products: {
        Row: {
          category: string | null
          created_at: string
          default_discounted_price: number
          default_original_price: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          store_id: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          default_discounted_price?: number
          default_original_price?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          store_id: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          default_discounted_price?: number
          default_original_price?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_bank_accounts: {
        Row: {
          account_holder: string | null
          created_at: string
          iban: string
          id: string
          store_id: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          created_at?: string
          iban: string
          id?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          created_at?: string
          iban?: string
          id?: string
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_bank_accounts_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: true
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_follows: {
        Row: {
          created_at: string
          id: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_follows_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_members: {
        Row: {
          created_at: string
          id: string
          role: string
          store_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          store_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          store_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_members_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_reports: {
        Row: {
          created_at: string
          id: string
          rating: number
          reason: string | null
          store_id: string
          user_id: string | null
          worth_it: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          rating: number
          reason?: string | null
          store_id: string
          user_id?: string | null
          worth_it?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          rating?: number
          reason?: string | null
          store_id?: string
          user_id?: string | null
          worth_it?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "store_reports_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          address: string | null
          admin_notes: string | null
          category: string
          city: string
          company_id_number: string | null
          company_name: string | null
          contact_email: string | null
          created_at: string
          delivery_enabled: boolean
          delivery_fee_base: number
          delivery_fee_per_km: number
          delivery_providers: string[]
          delivery_radius_km: number
          description: string | null
          district: string | null
          entity_type: string
          id: string
          lat: number | null
          lng: number | null
          logo: string | null
          logo_url: string | null
          min_order_for_delivery: number
          name: string
          name_en: string | null
          name_ru: string | null
          owner_id: string | null
          phone: string | null
          rejected_at: string | null
          rejection_reason: string | null
          representative_name: string | null
          service_start_date: string | null
          special_conditions: string | null
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string
          verification_checklist: Json
          visibility_radius_km: number | null
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          category?: string
          city?: string
          company_id_number?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee_base?: number
          delivery_fee_per_km?: number
          delivery_providers?: string[]
          delivery_radius_km?: number
          description?: string | null
          district?: string | null
          entity_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          logo?: string | null
          logo_url?: string | null
          min_order_for_delivery?: number
          name: string
          name_en?: string | null
          name_ru?: string | null
          owner_id?: string | null
          phone?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          representative_name?: string | null
          service_start_date?: string | null
          special_conditions?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
          verification_checklist?: Json
          visibility_radius_km?: number | null
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          category?: string
          city?: string
          company_id_number?: string | null
          company_name?: string | null
          contact_email?: string | null
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee_base?: number
          delivery_fee_per_km?: number
          delivery_providers?: string[]
          delivery_radius_km?: number
          description?: string | null
          district?: string | null
          entity_type?: string
          id?: string
          lat?: number | null
          lng?: number | null
          logo?: string | null
          logo_url?: string | null
          min_order_for_delivery?: number
          name?: string
          name_en?: string | null
          name_ru?: string | null
          owner_id?: string | null
          phone?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          representative_name?: string | null
          service_start_date?: string | null
          special_conditions?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
          verification_checklist?: Json
          visibility_radius_km?: number | null
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line: string
          apartment: string | null
          city: string | null
          courier_note: string | null
          created_at: string
          custom_label: string | null
          district: string | null
          door_code: string | null
          entrance: string | null
          floor: string | null
          id: string
          is_default: boolean
          label: string
          lat: number
          lng: number
          place_id: string | null
          postal_code: string | null
          street: string | null
          street_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          apartment?: string | null
          city?: string | null
          courier_note?: string | null
          created_at?: string
          custom_label?: string | null
          district?: string | null
          door_code?: string | null
          entrance?: string | null
          floor?: string | null
          id?: string
          is_default?: boolean
          label?: string
          lat: number
          lng: number
          place_id?: string | null
          postal_code?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          apartment?: string | null
          city?: string | null
          courier_note?: string | null
          created_at?: string
          custom_label?: string | null
          district?: string | null
          door_code?: string | null
          entrance?: string | null
          floor?: string | null
          id?: string
          is_default?: boolean
          label?: string
          lat?: number
          lng?: number
          place_id?: string | null
          postal_code?: string | null
          street?: string | null
          street_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auto_complete_stale_paid_orders: {
        Args: { _grace_hours?: number }
        Returns: {
          order_id: string
        }[]
      }
      generate_pending_payouts: {
        Args: {
          _commission?: number
          _generated_by?: string
          _min_payout?: number
        }
        Returns: {
          gross: number
          net: number
          order_count: number
          payout_id: string
          store_id: string
        }[]
      }
      get_store_report_stats: {
        Args: { _store_id: string }
        Returns: {
          average_rating: number
          report_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_store_member: {
        Args: { _store_id: string; _user_id: string }
        Returns: boolean
      }
      next_contract_number: { Args: never; Returns: string }
    }
    Enums: {
      app_role: "admin" | "partner" | "user"
      delivery_fee_payer: "customer" | "store" | "cheaper"
      delivery_provider:
        | "in_house"
        | "cheaper_fleet"
        | "wolt"
        | "bolt"
        | "glovo"
        | "manual"
        | "external_generic"
      delivery_status:
        | "pending"
        | "assigned"
        | "picked_up"
        | "on_the_way"
        | "delivered"
        | "failed"
        | "cancelled"
      order_method: "pickup" | "delivery"
      order_status:
        | "pending"
        | "paid"
        | "ready"
        | "collected"
        | "cancelled"
        | "gifted"
      store_status:
        | "pending_verification"
        | "active"
        | "suspended"
        | "pending_documents"
        | "rejected"
        | "inactive"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "partner", "user"],
      delivery_fee_payer: ["customer", "store", "cheaper"],
      delivery_provider: [
        "in_house",
        "cheaper_fleet",
        "wolt",
        "bolt",
        "glovo",
        "manual",
        "external_generic",
      ],
      delivery_status: [
        "pending",
        "assigned",
        "picked_up",
        "on_the_way",
        "delivered",
        "failed",
        "cancelled",
      ],
      order_method: ["pickup", "delivery"],
      order_status: [
        "pending",
        "paid",
        "ready",
        "collected",
        "cancelled",
        "gifted",
      ],
      store_status: [
        "pending_verification",
        "active",
        "suspended",
        "pending_documents",
        "rejected",
        "inactive",
      ],
    },
  },
} as const
