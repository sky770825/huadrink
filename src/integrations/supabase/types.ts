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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admins: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      registrations: {
        Row: {
          admin_note: string | null
          allergy_note: string | null
          attendee_list: Json | null
          company: string
          contact_name: string
          created_at: string
          diet: Database["public"]["Enums"]["diet_type"]
          diet_other: string | null
          email: string | null
          headcount: number
          id: string
          inviter: string | null
          invoice_needed: boolean
          invoice_tax_id: string | null
          invoice_title: string | null
          line_id: string | null
          pay_method: Database["public"]["Enums"]["payment_method"]
          pay_proof_url: string | null
          pay_status: Database["public"]["Enums"]["payment_status"]
          phone: string
          photo_consent: boolean
          ref_code: string
          seat_zone: Database["public"]["Enums"]["seat_zone"] | null
          status: Database["public"]["Enums"]["registration_status"]
          table_no: number | null
          title: string | null
          type: Database["public"]["Enums"]["registration_type"]
          updated_at: string
          vip_note: string | null
        }
        Insert: {
          admin_note?: string | null
          allergy_note?: string | null
          attendee_list?: Json | null
          company: string
          contact_name: string
          created_at?: string
          diet?: Database["public"]["Enums"]["diet_type"]
          diet_other?: string | null
          email?: string | null
          headcount?: number
          id?: string
          inviter?: string | null
          invoice_needed?: boolean
          invoice_tax_id?: string | null
          invoice_title?: string | null
          line_id?: string | null
          pay_method?: Database["public"]["Enums"]["payment_method"]
          pay_proof_url?: string | null
          pay_status?: Database["public"]["Enums"]["payment_status"]
          phone: string
          photo_consent?: boolean
          ref_code: string
          seat_zone?: Database["public"]["Enums"]["seat_zone"] | null
          status?: Database["public"]["Enums"]["registration_status"]
          table_no?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["registration_type"]
          updated_at?: string
          vip_note?: string | null
        }
        Update: {
          admin_note?: string | null
          allergy_note?: string | null
          attendee_list?: Json | null
          company?: string
          contact_name?: string
          created_at?: string
          diet?: Database["public"]["Enums"]["diet_type"]
          diet_other?: string | null
          email?: string | null
          headcount?: number
          id?: string
          inviter?: string | null
          invoice_needed?: boolean
          invoice_tax_id?: string | null
          invoice_title?: string | null
          line_id?: string | null
          pay_method?: Database["public"]["Enums"]["payment_method"]
          pay_proof_url?: string | null
          pay_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string
          photo_consent?: boolean
          ref_code?: string
          seat_zone?: Database["public"]["Enums"]["seat_zone"] | null
          status?: Database["public"]["Enums"]["registration_status"]
          table_no?: number | null
          title?: string | null
          type?: Database["public"]["Enums"]["registration_type"]
          updated_at?: string
          vip_note?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_ref_code: { Args: never; Returns: string }
    }
    Enums: {
      diet_type: "normal" | "vegetarian" | "no_beef" | "no_pork" | "other"
      payment_method: "transfer" | "cash" | "other"
      payment_status: "paid" | "unpaid"
      registration_status: "open" | "closed" | "waitlist"
      registration_type: "internal" | "external" | "vip"
      seat_zone: "vip" | "general" | "internal"
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
      diet_type: ["normal", "vegetarian", "no_beef", "no_pork", "other"],
      payment_method: ["transfer", "cash", "other"],
      payment_status: ["paid", "unpaid"],
      registration_status: ["open", "closed", "waitlist"],
      registration_type: ["internal", "external", "vip"],
      seat_zone: ["vip", "general", "internal"],
    },
  },
} as const
