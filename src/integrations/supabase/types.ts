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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      email_events: {
        Row: {
          created_at: string
          email_queue_id: string | null
          event_type: Database["public"]["Enums"]["email_event_type"]
          id: string
          lead_id: string | null
          metadata: Json
          occurred_at: string
          provider_event_id: string | null
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email_queue_id?: string | null
          event_type: Database["public"]["Enums"]["email_event_type"]
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          provider_event_id?: string | null
          workspace_id: string
        }
        Update: {
          created_at?: string
          email_queue_id?: string | null
          event_type?: Database["public"]["Enums"]["email_event_type"]
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          provider_event_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_events_email_queue_id_fkey"
            columns: ["email_queue_id"]
            isOneToOne: false
            referencedRelation: "email_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          attempt_count: number
          body_html: string | null
          body_text: string
          campaign_id: string | null
          created_at: string
          failed_at: string | null
          id: string
          idempotency_key: string
          last_error_code: string | null
          last_error_message: string | null
          lead_id: string
          max_attempts: number
          next_retry_at: string | null
          processing_started_at: string | null
          provider: string
          provider_message_id: string | null
          scheduled_at: string
          sender_id: string | null
          sent_at: string | null
          sequence_id: string | null
          sequence_step_id: string | null
          status: Database["public"]["Enums"]["email_queue_status"]
          subject: string
          to_email: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          attempt_count?: number
          body_html?: string | null
          body_text: string
          campaign_id?: string | null
          created_at?: string
          failed_at?: string | null
          id?: string
          idempotency_key: string
          last_error_code?: string | null
          last_error_message?: string | null
          lead_id: string
          max_attempts?: number
          next_retry_at?: string | null
          processing_started_at?: string | null
          provider?: string
          provider_message_id?: string | null
          scheduled_at?: string
          sender_id?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          sequence_step_id?: string | null
          status?: Database["public"]["Enums"]["email_queue_status"]
          subject: string
          to_email: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          attempt_count?: number
          body_html?: string | null
          body_text?: string
          campaign_id?: string | null
          created_at?: string
          failed_at?: string | null
          id?: string
          idempotency_key?: string
          last_error_code?: string | null
          last_error_message?: string | null
          lead_id?: string
          max_attempts?: number
          next_retry_at?: string | null
          processing_started_at?: string | null
          provider?: string
          provider_message_id?: string | null
          scheduled_at?: string
          sender_id?: string | null
          sent_at?: string | null
          sequence_id?: string | null
          sequence_step_id?: string | null
          status?: Database["public"]["Enums"]["email_queue_status"]
          subject?: string
          to_email?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_queue_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_queue_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          actor_id: string | null
          body: string | null
          created_at: string
          id: string
          lead_id: string
          metadata: Json
          title: string
          type: string
          workspace_id: string
        }
        Insert: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          lead_id: string
          metadata?: Json
          title: string
          type: string
          workspace_id: string
        }
        Update: {
          actor_id?: string | null
          body?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          metadata?: Json
          title?: string
          type?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_consents: {
        Row: {
          captured_at: string
          consent_status: Database["public"]["Enums"]["consent_status"]
          consent_text_version: string
          consent_type: string
          id: string
          lawful_basis: Database["public"]["Enums"]["lawful_basis"]
          lead_id: string
          metadata: Json
          source: string
          withdrawn_at: string | null
          workspace_id: string
        }
        Insert: {
          captured_at?: string
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consent_text_version?: string
          consent_type?: string
          id?: string
          lawful_basis?: Database["public"]["Enums"]["lawful_basis"]
          lead_id: string
          metadata?: Json
          source?: string
          withdrawn_at?: string | null
          workspace_id: string
        }
        Update: {
          captured_at?: string
          consent_status?: Database["public"]["Enums"]["consent_status"]
          consent_text_version?: string
          consent_type?: string
          id?: string
          lawful_basis?: Database["public"]["Enums"]["lawful_basis"]
          lead_id?: string
          metadata?: Json
          source?: string
          withdrawn_at?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_consents_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_consents_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_emails: {
        Row: {
          body: string
          created_at: string
          id: string
          lead_id: string
          opened_at: string | null
          provider_message_id: string | null
          replied_at: string | null
          sender_id: string | null
          status: string
          subject: string
          to_email: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          lead_id: string
          opened_at?: string | null
          provider_message_id?: string | null
          replied_at?: string | null
          sender_id?: string | null
          status?: string
          subject: string
          to_email: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lead_id?: string
          opened_at?: string | null
          provider_message_id?: string | null
          replied_at?: string | null
          sender_id?: string | null
          status?: string
          subject?: string
          to_email?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_emails_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_emails_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company: string | null
          company_domain: string | null
          company_size: string | null
          consent_at: string | null
          consent_ip: string | null
          country: string | null
          created_at: string
          do_not_contact: boolean
          email: string
          estimated_value: number
          first_name: string
          first_touch_at: string | null
          id: string
          job_title: string | null
          last_contacted_at: string | null
          last_name: string | null
          last_touch_at: string | null
          linkedin_url: string | null
          marketing_consent: boolean
          normalized_email: string | null
          normalized_phone: string | null
          notes: string | null
          owner_id: string | null
          phone: string | null
          score: number
          score_breakdown: Json
          source: Database["public"]["Enums"]["lead_source"]
          source_record_id: string | null
          source_url: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          utm: Json
          workspace_id: string
        }
        Insert: {
          company?: string | null
          company_domain?: string | null
          company_size?: string | null
          consent_at?: string | null
          consent_ip?: string | null
          country?: string | null
          created_at?: string
          do_not_contact?: boolean
          email: string
          estimated_value?: number
          first_name: string
          first_touch_at?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          last_touch_at?: string | null
          linkedin_url?: string | null
          marketing_consent?: boolean
          normalized_email?: string | null
          normalized_phone?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          score?: number
          score_breakdown?: Json
          source?: Database["public"]["Enums"]["lead_source"]
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm?: Json
          workspace_id: string
        }
        Update: {
          company?: string | null
          company_domain?: string | null
          company_size?: string | null
          consent_at?: string | null
          consent_ip?: string | null
          country?: string | null
          created_at?: string
          do_not_contact?: boolean
          email?: string
          estimated_value?: number
          first_name?: string
          first_touch_at?: string | null
          id?: string
          job_title?: string | null
          last_contacted_at?: string | null
          last_name?: string | null
          last_touch_at?: string | null
          linkedin_url?: string | null
          marketing_consent?: boolean
          normalized_email?: string | null
          normalized_phone?: string | null
          notes?: string | null
          owner_id?: string | null
          phone?: string | null
          score?: number
          score_breakdown?: Json
          source?: Database["public"]["Enums"]["lead_source"]
          source_record_id?: string | null
          source_url?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm?: Json
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company: string | null
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      suppression_list: {
        Row: {
          created_at: string
          email: string
          expires_at: string | null
          id: string
          reason: Database["public"]["Enums"]["suppression_reason"]
          source: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          email: string
          expires_at?: string | null
          id?: string
          reason: Database["public"]["Enums"]["suppression_reason"]
          source?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string | null
          id?: string
          reason?: Database["public"]["Enums"]["suppression_reason"]
          source?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppression_list_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
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
      workspace_members: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["workspace_role"]
          status: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["workspace_role"]
          status?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          daily_email_limit: number
          id: string
          name: string
          owner_id: string | null
          plan: string
          slug: string
          status: string
          timezone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          daily_email_limit?: number
          id?: string
          name: string
          owner_id?: string | null
          plan?: string
          slug: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          daily_email_limit?: number
          id?: string
          name?: string
          owner_id?: string | null
          plan?: string
          slug?: string
          status?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_workspace_ids: { Args: never; Returns: string[] }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_workspace_role: {
        Args: {
          _roles: Database["public"]["Enums"]["workspace_role"][]
          _workspace_id: string
        }
        Returns: boolean
      }
      is_workspace_member: { Args: { _workspace_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "manager" | "rep"
      consent_status: "granted" | "withdrawn" | "pending" | "not_required"
      email_event_type:
        | "queued"
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "replied"
        | "bounced"
        | "complained"
        | "unsubscribed"
        | "failed"
      email_queue_status:
        | "draft"
        | "pending_approval"
        | "queued"
        | "processing"
        | "sent"
        | "failed"
        | "cancelled"
        | "suppressed"
      lawful_basis:
        | "consent"
        | "legitimate_interest"
        | "contract"
        | "legal_obligation"
      lead_source:
        | "website_form"
        | "chatbot"
        | "webinar"
        | "referral"
        | "paid_ads"
        | "outbound"
        | "other"
      lead_status:
        | "new"
        | "contacted"
        | "qualified"
        | "mql"
        | "sql"
        | "meeting"
        | "won"
        | "lost"
      suppression_reason:
        | "unsubscribe"
        | "hard_bounce"
        | "spam_complaint"
        | "manual_block"
        | "legal_restriction"
      workspace_role: "owner" | "admin" | "manager" | "sales_rep" | "viewer"
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
      app_role: ["admin", "manager", "rep"],
      consent_status: ["granted", "withdrawn", "pending", "not_required"],
      email_event_type: [
        "queued",
        "sent",
        "delivered",
        "opened",
        "clicked",
        "replied",
        "bounced",
        "complained",
        "unsubscribed",
        "failed",
      ],
      email_queue_status: [
        "draft",
        "pending_approval",
        "queued",
        "processing",
        "sent",
        "failed",
        "cancelled",
        "suppressed",
      ],
      lawful_basis: [
        "consent",
        "legitimate_interest",
        "contract",
        "legal_obligation",
      ],
      lead_source: [
        "website_form",
        "chatbot",
        "webinar",
        "referral",
        "paid_ads",
        "outbound",
        "other",
      ],
      lead_status: [
        "new",
        "contacted",
        "qualified",
        "mql",
        "sql",
        "meeting",
        "won",
        "lost",
      ],
      suppression_reason: [
        "unsubscribe",
        "hard_bounce",
        "spam_complaint",
        "manual_block",
        "legal_restriction",
      ],
      workspace_role: ["owner", "admin", "manager", "sales_rep", "viewer"],
    },
  },
} as const
