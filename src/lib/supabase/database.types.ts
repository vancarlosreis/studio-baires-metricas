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
          accounts_engaged: number | null
          comments: number | null
          created_at: string
          follower_count_delta: number | null
          followers_count: number | null
          follows_count: number | null
          id: string
          ig_account_id: string
          impressions: number | null
          likes: number | null
          media_count: number | null
          online_followers: Json | null
          profile_links_taps: number | null
          profile_views: number | null
          raw_payload: Json | null
          reach: number | null
          replies: number | null
          saves: number | null
          shares: number | null
          snapshot_date: string
          total_interactions: number | null
          views: number | null
          website_clicks: number | null
          paid_reach: number | null
          paid_views: number | null
          paid_total_interactions: number | null
          organic_reach: number | null
          organic_views: number | null
          organic_total_interactions: number | null
        }
        Insert: {
          accounts_engaged?: number | null
          comments?: number | null
          created_at?: string
          follower_count_delta?: number | null
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id: string
          impressions?: number | null
          likes?: number | null
          media_count?: number | null
          online_followers?: Json | null
          profile_links_taps?: number | null
          profile_views?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_date: string
          total_interactions?: number | null
          views?: number | null
          website_clicks?: number | null
          paid_reach?: number | null
          paid_views?: number | null
          paid_total_interactions?: number | null
          organic_reach?: number | null
          organic_views?: number | null
          organic_total_interactions?: number | null
        }
        Update: {
          accounts_engaged?: number | null
          comments?: number | null
          created_at?: string
          follower_count_delta?: number | null
          followers_count?: number | null
          follows_count?: number | null
          id?: string
          ig_account_id?: string
          impressions?: number | null
          likes?: number | null
          media_count?: number | null
          online_followers?: Json | null
          profile_links_taps?: number | null
          profile_views?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_date?: string
          total_interactions?: number | null
          views?: number | null
          website_clicks?: number | null
          paid_reach?: number | null
          paid_views?: number | null
          paid_total_interactions?: number | null
          organic_reach?: number | null
          organic_views?: number | null
          organic_total_interactions?: number | null
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
      fb_ad_accounts: {
        Row: {
          id: string
          user_id: string
          ig_account_id: string
          fb_ad_account_id: string
          name: string | null
          currency: string | null
          timezone_name: string | null
          account_status: number | null
          is_active: boolean
          connected_at: string
          last_synced_at: string | null
          raw_payload: Json | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          ig_account_id: string
          fb_ad_account_id: string
          name?: string | null
          currency?: string | null
          timezone_name?: string | null
          account_status?: number | null
          is_active?: boolean
          connected_at?: string
          last_synced_at?: string | null
          raw_payload?: Json | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          ig_account_id?: string
          fb_ad_account_id?: string
          name?: string | null
          currency?: string | null
          timezone_name?: string | null
          account_status?: number | null
          is_active?: boolean
          connected_at?: string
          last_synced_at?: string | null
          raw_payload?: Json | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_paid_insights: {
        Row: {
          id: string
          media_id: string
          snapshot_at: string
          paid_reach: number | null
          paid_impressions: number | null
          paid_clicks: number | null
          paid_spend: number | null
          paid_video_views: number | null
          paid_engagement: number | null
          ad_count: number | null
          raw_payload: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          media_id: string
          snapshot_at?: string
          paid_reach?: number | null
          paid_impressions?: number | null
          paid_clicks?: number | null
          paid_spend?: number | null
          paid_video_views?: number | null
          paid_engagement?: number | null
          ad_count?: number | null
          raw_payload?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          media_id?: string
          snapshot_at?: string
          paid_reach?: number | null
          paid_impressions?: number | null
          paid_clicks?: number | null
          paid_spend?: number | null
          paid_video_views?: number | null
          paid_engagement?: number | null
          ad_count?: number | null
          raw_payload?: Json | null
          created_at?: string
        }
        Relationships: []
      }
      audience_demographics: {
        Row: {
          audience_type: Database["public"]["Enums"]["audience_type"]
          breakdown: Database["public"]["Enums"]["demographic_breakdown"]
          breakdown_values: Json
          created_at: string
          id: string
          ig_account_id: string
          raw_payload: Json | null
          snapshot_date: string
        }
        Insert: {
          audience_type: Database["public"]["Enums"]["audience_type"]
          breakdown: Database["public"]["Enums"]["demographic_breakdown"]
          breakdown_values?: Json
          created_at?: string
          id?: string
          ig_account_id: string
          raw_payload?: Json | null
          snapshot_date: string
        }
        Update: {
          audience_type?: Database["public"]["Enums"]["audience_type"]
          breakdown?: Database["public"]["Enums"]["demographic_breakdown"]
          breakdown_values?: Json
          created_at?: string
          id?: string
          ig_account_id?: string
          raw_payload?: Json | null
          snapshot_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "audience_demographics_ig_account_id_fkey"
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
          account_type: string | null
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
          account_type?: string | null
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
          account_type?: string | null
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
          media_product_type: string | null
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
          media_product_type?: string | null
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
          media_product_type?: string | null
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
          follows: number | null
          id: string
          impressions: number | null
          likes: number | null
          media_id: string
          navigation: number | null
          plays: number | null
          profile_activity: number | null
          profile_visits: number | null
          raw_payload: Json | null
          reach: number | null
          replies: number | null
          saves: number | null
          shares: number | null
          snapshot_at: string
          taps_back: number | null
          taps_forward: number | null
          total_interactions: number | null
          video_views: number | null
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          exits?: number | null
          follows?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_id: string
          navigation?: number | null
          plays?: number | null
          profile_activity?: number | null
          profile_visits?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_at?: string
          taps_back?: number | null
          taps_forward?: number | null
          total_interactions?: number | null
          video_views?: number | null
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          exits?: number | null
          follows?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          media_id?: string
          navigation?: number | null
          plays?: number | null
          profile_activity?: number | null
          profile_visits?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          saves?: number | null
          shares?: number | null
          snapshot_at?: string
          taps_back?: number | null
          taps_forward?: number | null
          total_interactions?: number | null
          video_views?: number | null
          views?: number | null
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
      stories: {
        Row: {
          caption: string | null
          created_at: string
          exits: number | null
          expires_at: string | null
          id: string
          ig_account_id: string
          ig_media_id: string
          media_type: string | null
          media_url: string | null
          navigation: number | null
          permalink: string | null
          posted_at: string
          profile_activity: number | null
          profile_visits: number | null
          raw_payload: Json | null
          reach: number | null
          replies: number | null
          shares: number | null
          swipe_forward: number | null
          taps_back: number | null
          taps_forward: number | null
          thumbnail_url: string | null
          total_interactions: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          exits?: number | null
          expires_at?: string | null
          id?: string
          ig_account_id: string
          ig_media_id: string
          media_type?: string | null
          media_url?: string | null
          navigation?: number | null
          permalink?: string | null
          posted_at: string
          profile_activity?: number | null
          profile_visits?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          shares?: number | null
          swipe_forward?: number | null
          taps_back?: number | null
          taps_forward?: number | null
          thumbnail_url?: string | null
          total_interactions?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          exits?: number | null
          expires_at?: string | null
          id?: string
          ig_account_id?: string
          ig_media_id?: string
          media_type?: string | null
          media_url?: string | null
          navigation?: number | null
          permalink?: string | null
          posted_at?: string
          profile_activity?: number | null
          profile_visits?: number | null
          raw_payload?: Json | null
          reach?: number | null
          replies?: number | null
          shares?: number | null
          swipe_forward?: number | null
          taps_back?: number | null
          taps_forward?: number | null
          thumbnail_url?: string | null
          total_interactions?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_ig_account_id_fkey"
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
      audience_type: "follower" | "reached" | "engaged"
      demographic_breakdown: "age" | "gender" | "city" | "country"
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
      audience_type: ["follower", "reached", "engaged"],
      demographic_breakdown: ["age", "gender", "city", "country"],
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
