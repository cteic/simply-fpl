// Supabase database schema — matches supabase/migrations/*.sql

export type Tier = 'free' | 'pro' | 'ultimate';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          fpl_entry_id: number | null;
          is_pro: boolean;
          pro_until: string | null;
          tier: Tier;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          fpl_entry_id?: number | null;
          is_pro?: boolean;
          pro_until?: string | null;
          tier?: Tier;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        };
        Update: {
          fpl_entry_id?: number | null;
          is_pro?: boolean;
          pro_until?: string | null;
          tier?: Tier;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
        };
        Relationships: [];
      };
      frank_queries: {
        Row: {
          id: string;
          user_id: string;
          question: string;
          response: unknown;
          model: string | null;
          tokens_in: number | null;
          tokens_out: number | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          question: string;
          response?: unknown;
          model?: string | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
        };
        Update: {
          response?: unknown;
          model?: string | null;
          tokens_in?: number | null;
          tokens_out?: number | null;
        };
        Relationships: [];
      };
      stripe_events: {
        Row: {
          id: string;
          processed_at: string;
        };
        Insert: {
          id: string;
        };
        Update: Record<string, never>;
        Relationships: [];
      };
      user_leagues: {
        Row: {
          user_id: string;
          league_id: number;
          position: number;
          created_at: string;
        };
        Insert: {
          user_id: string;
          league_id: number;
          position?: number;
        };
        Update: {
          position?: number;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          platform: 'web';
          endpoint: string;
          p256dh: string;
          auth_key: string;
          created_at: string;
          last_used_at: string | null;
          last_error: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: 'web';
          endpoint: string;
          p256dh: string;
          auth_key: string;
          last_used_at?: string | null;
          last_error?: string | null;
        };
        Update: {
          last_used_at?: string | null;
          last_error?: string | null;
        };
        Relationships: [];
      };
      notification_prefs: {
        Row: {
          user_id: string;
          deadline_reminder: boolean;
          captain_scored: boolean;
          bonus_confirmed: boolean;
          price_drop: boolean;
          rank_swing: boolean;
          rank_swing_threshold: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          deadline_reminder?: boolean;
          captain_scored?: boolean;
          bonus_confirmed?: boolean;
          price_drop?: boolean;
          rank_swing?: boolean;
          rank_swing_threshold?: number;
          updated_at?: string;
        };
        Update: {
          deadline_reminder?: boolean;
          captain_scored?: boolean;
          bonus_confirmed?: boolean;
          price_drop?: boolean;
          rank_swing?: boolean;
          rank_swing_threshold?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      notification_log: {
        Row: {
          id: number;
          user_id: string | null;
          event: string;
          payload: unknown;
          sent_at: string;
          clicked_at: string | null;
        };
        Insert: {
          user_id?: string | null;
          event: string;
          payload?: unknown;
          sent_at?: string;
          clicked_at?: string | null;
        };
        Update: {
          clicked_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserLeague = Database['public']['Tables']['user_leagues']['Row'];
