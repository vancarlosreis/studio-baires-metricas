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
      account_snapshots: {
        Row: {
          created_at: string
          followers_count: number | null
          follows_count: number | null
          id: string
          ig_account_id: string
          impressions: number | null
          media_count: number | null
          profile_views: number | null
          raw_payload: Json | null
          reach: number | null
          snapshot_date: string
          website_clicks: number | null
        }
        Insert: {
          created_at?: string
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id: string
          impressions?: number | null
          media_count?: number | null
          profile_views?: number | null
          raw_payload?: Json | null
          reach?: number | null
          snapshot_date: string
          website_clicks?: number | null
        }
        Update: {
          created_at?: string
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id?: string
          impressions?: number | null
          media_count?: number | null
          profile_views?: number | null
          raw_payload?: Json | null
          reach?: number | null
          snapshot_date?: string
          website_clicks?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "account_snapshots_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_accounts: {
        Row: {
          access_token_encrypted: string
          auth_method: Database["public"]["Enums"]["ig_auth_method"]
          connected_at: string
          created_at: string
          fb_page_id: string | null
          fb_page_name: string | null
          id: string
          ig_account_name: string | null
          ig_profile_picture_url: string | null
          ig_user_id: string
          ig_username: string
          is_active: boolean
          last_synced_at: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token_encrypted: string
          auth_method?: Database["public"]["Enums"]["ig_auth_method"]
          connected_at?: string
          created_at?: string
          fb_page_id?: string | null
          fb_page_name?: string | null
          id?: string
          ig_account_name?: string | null
          ig_profile_picture_url?: string | null
          ig_user_id: string
          ig_username: string
          is_active?: boolean
          last_synced_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token_encrypted?: string
          auth_method?: Database["public"]["Enums"]["ig_auth_method"]
          connected_at?: string
          created_at?: string
          fb_page_id?: string | null
          fb_page_name?: string | null
          id?: string
          ig_account_name?: string | null
          ig_profile_picture_url?: string | null
          ig_user_id?: string
          ig_username?: string
          is_active?: boolean
          last_synced_at?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          caption: string | null
          created_at: string
          expires_at: string | null
          id: string
          ig_account_id: string
          ig_media_id: string
          kind: Database["public"]["Enums"]["media_kind"]
          media_url: string | null
          permalink: string | null
          posted_at: string
          raw_payload: Json | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_account_id: string
          ig_media_id: string
          kind: Database["public"]["Enums"]["media_kind"]
          media_url?: string | null
          permalink?: string | null
          posted_at: string
          raw_payload?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          ig_account_id?: string
          ig_media_id?: string
          kind?: Database["public"]["Enums"]["media_kind"]
          media_url?: string | null
          permalink?: string | null
          posted_at?: string
          raw_payload?: Json | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_insights: {
        Row: {
          comments: number | null
          created_at: string
          exits: number | null
          id: string
          impressions: number | null
          likes: number | null
          media_id: string
          plays: number | null
          raw_payload: Json | null
          reach: number | null
          replies: number | null
          saves: number | null
          shares: number | null
          snapshot_at: string
          taps_back: number | null
          taps_forward: number | null
          video_views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          exits?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_id: string
          plays?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_at?: string
          taps_back?: number | null
          taps_forward?: number | null
          video_views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          exits?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_id?: string
          plays?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_at?: string
          taps_back?: number | null
          taps_forward?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "media_insights_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          ig_account_id: string
          pdf_path: string | null
          period_end: string
          period_start: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          ig_account_id: string
          pdf_path?: string | null
          period_end: string
          period_start: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          ig_account_id?: string
          pdf_path?: string | null
          period_end?: string
          period_start?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_jobs: {
        Row: {
          created_at: string
          error_message: string | null
          finished_at: string | null
          id: string
          ig_account_id: string | null
          kind: Database["public"]["Enums"]["sync_kind"]
          metadata: Json | null
          started_at: string | null
          status: Database["public"]["Enums"]["sync_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          ig_account_id?: string | null
          kind: Database["public"]["Enums"]["sync_kind"]
          metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          finished_at?: string | null
          id?: string
          ig_account_id?: string | null
          kind?: Database["public"]["Enums"]["sync_kind"]
          metadata?: Json | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["sync_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_jobs_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "ig_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      ig_auth_method: "business_login" | "facebook_login"
      media_kind: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM" | "REELS" | "STORY"
      sync_kind:
        | "account_profile"
        | "account_insights"
        | "media_list"
        | "media_insights"
        | "stories"
      sync_status: "pending" | "running" | "success" | "failed"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      ig_auth_method: ["business_login", "facebook_login"],
      media_kind: ["IMAGE", "VIDEO", "CAROUSEL_ALBUM", "REELS", "STORY"],
      sync_kind: [
        "account_profile",
        "account_insights",
        "media_list",
        "media_insights",
        "stories",
      ],
      sync_status: ["pending", "running", "success", "failed"],
    },
  },
} as const
