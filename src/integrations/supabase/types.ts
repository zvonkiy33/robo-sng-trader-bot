export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      api_credentials: {
        Row: {
          api_key: string
          api_secret: string
          created_at: string
          exchange: string
          id: string
          is_active: boolean
          is_demo: boolean
          is_encrypted: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          api_secret: string
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_encrypted?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          api_secret?: string
          created_at?: string
          exchange?: string
          id?: string
          is_active?: boolean
          is_demo?: boolean
          is_encrypted?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_usage_logs: {
        Row: {
          api_name: string
          created_at: string
          endpoint: string
          error_message: string | null
          id: string
          request_count: number | null
          response_time_ms: number | null
          status_code: number | null
          user_id: string
        }
        Insert: {
          api_name: string
          created_at?: string
          endpoint: string
          error_message?: string | null
          id?: string
          request_count?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id: string
        }
        Update: {
          api_name?: string
          created_at?: string
          endpoint?: string
          error_message?: string | null
          id?: string
          request_count?: number | null
          response_time_ms?: number | null
          status_code?: number | null
          user_id?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          created_at: string
          daily_loss_limit_percent: number
          id: string
          is_active: boolean
          is_demo: boolean
          max_positions: number
          min_signal_strength: number
          position_size_percent: number
          stop_loss_percent: number
          take_profit_percent: number
          timeframe: string | null
          trading_pairs: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_loss_limit_percent?: number
          id?: string
          is_active?: boolean
          is_demo?: boolean
          max_positions?: number
          min_signal_strength?: number
          position_size_percent?: number
          stop_loss_percent?: number
          take_profit_percent?: number
          timeframe?: string | null
          trading_pairs?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_loss_limit_percent?: number
          id?: string
          is_active?: boolean
          is_demo?: boolean
          max_positions?: number
          min_signal_strength?: number
          position_size_percent?: number
          stop_loss_percent?: number
          take_profit_percent?: number
          timeframe?: string | null
          trading_pairs?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      portfolio_snapshots: {
        Row: {
          available_balance: number
          created_at: string
          daily_pnl: number
          id: string
          open_positions: number
          snapshot_date: string
          total_balance: number
          total_pnl: number
          unrealized_pnl: number
          user_id: string
          win_rate: number | null
        }
        Insert: {
          available_balance: number
          created_at?: string
          daily_pnl?: number
          id?: string
          open_positions?: number
          snapshot_date?: string
          total_balance: number
          total_pnl?: number
          unrealized_pnl?: number
          user_id: string
          win_rate?: number | null
        }
        Update: {
          available_balance?: number
          created_at?: string
          daily_pnl?: number
          id?: string
          open_positions?: number
          snapshot_date?: string
          total_balance?: number
          total_pnl?: number
          unrealized_pnl?: number
          user_id?: string
          win_rate?: number | null
        }
        Relationships: []
      }
      tokenmetrics_cache: {
        Row: {
          api_calls_count: number | null
          created_at: string
          id: string
          signals: Json
          symbols: string[]
          timeframe: string
          updated_at: string
          user_id: string
        }
        Insert: {
          api_calls_count?: number | null
          created_at?: string
          id?: string
          signals: Json
          symbols: string[]
          timeframe?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          api_calls_count?: number | null
          created_at?: string
          id?: string
          signals?: Json
          symbols?: string[]
          timeframe?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tokenmetrics_credentials: {
        Row: {
          api_key: string
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          api_key: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          api_key?: string
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trades: {
        Row: {
          closed_at: string | null
          created_at: string
          exchange_order_id: string | null
          fees: number | null
          filled_at: string | null
          filled_price: number | null
          id: string
          order_type: string
          pnl: number | null
          price: number | null
          quantity: number
          side: string
          signal_source: string | null
          signal_strength: number | null
          status: string
          stop_loss: number | null
          symbol: string
          take_profit: number | null
          user_id: string
        }
        Insert: {
          closed_at?: string | null
          created_at?: string
          exchange_order_id?: string | null
          fees?: number | null
          filled_at?: string | null
          filled_price?: number | null
          id?: string
          order_type?: string
          pnl?: number | null
          price?: number | null
          quantity: number
          side: string
          signal_source?: string | null
          signal_strength?: number | null
          status?: string
          stop_loss?: number | null
          symbol: string
          take_profit?: number | null
          user_id: string
        }
        Update: {
          closed_at?: string | null
          created_at?: string
          exchange_order_id?: string | null
          fees?: number | null
          filled_at?: string | null
          filled_price?: number | null
          id?: string
          order_type?: string
          pnl?: number | null
          price?: number | null
          quantity?: number
          side?: string
          signal_source?: string | null
          signal_strength?: number | null
          status?: string
          stop_loss?: number | null
          symbol?: string
          take_profit?: number | null
          user_id?: string
        }
        Relationships: []
      }
      trading_pairs: {
        Row: {
          base_asset: string
          created_at: string
          id: string
          is_active: boolean
          min_order_size: number | null
          quote_asset: string
          symbol: string
          tick_size: number | null
        }
        Insert: {
          base_asset: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_order_size?: number | null
          quote_asset: string
          symbol: string
          tick_size?: number | null
        }
        Update: {
          base_asset?: string
          created_at?: string
          id?: string
          is_active?: boolean
          min_order_size?: number | null
          quote_asset?: string
          symbol?: string
          tick_size?: number | null
        }
        Relationships: []
      }
      trading_signals: {
        Row: {
          confidence: number | null
          created_at: string
          holding_returns: number | null
          id: string
          investor_grade: number | null
          signal_date: string | null
          tm_link: string | null
          token_id: number | null
          token_name: string | null
          token_symbol: string | null
          token_trend: number | null
          trader_grade: number | null
          trading_signal: number | null
          trading_signals_returns: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          holding_returns?: number | null
          id?: string
          investor_grade?: number | null
          signal_date?: string | null
          tm_link?: string | null
          token_id?: number | null
          token_name?: string | null
          token_symbol?: string | null
          token_trend?: number | null
          trader_grade?: number | null
          trading_signal?: number | null
          trading_signals_returns?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          confidence?: number | null
          created_at?: string
          holding_returns?: number | null
          id?: string
          investor_grade?: number | null
          signal_date?: string | null
          tm_link?: string | null
          token_id?: number | null
          token_name?: string | null
          token_symbol?: string | null
          token_trend?: number | null
          trader_grade?: number | null
          trading_signal?: number | null
          trading_signals_returns?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      clean_old_api_logs: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      clean_old_tokenmetrics_cache: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      decrypt_api_credential: {
        Args: { encrypted_credential: string }
        Returns: string
      }
      encrypt_api_credential: {
        Args: { credential_text: string }
        Returns: string
      }
      execute_trading_bot_automation: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_decrypted_credentials: {
        Args: { p_user_id: string; p_exchange?: string; p_is_demo?: boolean }
        Returns: {
          api_key: string
          api_secret: string
        }[]
      }
      update_api_credentials_secure: {
        Args: {
          p_user_id: string
          p_api_key: string
          p_api_secret: string
          p_exchange?: string
          p_is_demo?: boolean
        }
        Returns: undefined
      }
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
    Enums: {},
  },
} as const
