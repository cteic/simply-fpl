// Supabase database schema — matches supabase/migrations/0001_init.sql

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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          fpl_entry_id?: number | null;
          is_pro?: boolean;
          pro_until?: string | null;
        };
        Update: {
          fpl_entry_id?: number | null;
          is_pro?: boolean;
          pro_until?: string | null;
        };
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type UserLeague = Database['public']['Tables']['user_leagues']['Row'];
