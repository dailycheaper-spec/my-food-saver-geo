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
      offers: {
        Row: {
          available_date: string
          category: string
          created_at: string
          delivery_available: boolean
          description: string | null
          discounted_price: number
          id: string
          image_url: string | null
          is_active: boolean
          original_price: number
          pickup_available: boolean
          pickup_from: string
          pickup_to: string
          quantity_available: number
          quantity_sold: number
          store_id: string
          title: string
          updated_at: string
        }
        Insert: {
          available_date?: string
          category?: string
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          discounted_price: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          original_price: number
          pickup_available?: boolean
          pickup_from?: string
          pickup_to?: string
          quantity_available?: number
          quantity_sold?: number
          store_id: string
          title: string
          updated_at?: string
        }
        Update: {
          available_date?: string
          category?: string
          created_at?: string
          delivery_available?: boolean
          description?: string | null
          discounted_price?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          original_price?: number
          pickup_available?: boolean
          pickup_from?: string
          pickup_to?: string
          quantity_available?: number
          quantity_sold?: number
          store_id?: string
          title?: string
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
      orders: {
        Row: {
          amount: number
          code: string
          collected_at: string | null
          created_at: string
          delivery_address: string | null
          delivery_id: string | null
          delivery_lat: number | null
          delivery_lng: number | null
          gifted_to: string | null
          id: string
          method: Database["public"]["Enums"]["order_method"]
          notes: string | null
          offer_id: string
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
          delivery_address?: string | null
          delivery_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          gifted_to?: string | null
          id?: string
          method?: Database["public"]["Enums"]["order_method"]
          notes?: string | null
          offer_id: string
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
          delivery_address?: string | null
          delivery_id?: string | null
          delivery_lat?: number | null
          delivery_lng?: number | null
          gifted_to?: string | null
          id?: string
          method?: Database["public"]["Enums"]["order_method"]
          notes?: string | null
          offer_id?: string
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
            foreignKeyName: "orders_store_id_fkey"
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
          created_at: string
          id: string
          paid_at: string | null
          status: string
          store_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          paid_at?: string | null
          status?: string
          store_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          paid_at?: string | null
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
      profiles: {
        Row: {
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
      stores: {
        Row: {
          address: string | null
          category: string
          city: string
          created_at: string
          delivery_enabled: boolean
          delivery_fee_base: number
          delivery_fee_per_km: number
          delivery_providers: string[]
          delivery_radius_km: number
          description: string | null
          district: string | null
          id: string
          lat: number | null
          lng: number | null
          logo: string | null
          min_order_for_delivery: number
          name: string
          owner_id: string | null
          phone: string | null
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string
          city?: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee_base?: number
          delivery_fee_per_km?: number
          delivery_providers?: string[]
          delivery_radius_km?: number
          description?: string | null
          district?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo?: string | null
          min_order_for_delivery?: number
          name: string
          owner_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string
          city?: string
          created_at?: string
          delivery_enabled?: boolean
          delivery_fee_base?: number
          delivery_fee_per_km?: number
          delivery_providers?: string[]
          delivery_radius_km?: number
          description?: string | null
          district?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          logo?: string | null
          min_order_for_delivery?: number
          name?: string
          owner_id?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
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
      store_status: "pending" | "active" | "suspended"
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
      store_status: ["pending", "active", "suspended"],
    },
  },
} as const
