import { createBrowserClient } from '@supabase/ssr';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          saved_team_ids: number[];
          is_pro: boolean;
          pro_expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          saved_team_ids?: number[];
          is_pro?: boolean;
          pro_expires_at?: string | null;
        };
        Update: {
          saved_team_ids?: number[];
          is_pro?: boolean;
          pro_expires_at?: string | null;
          updated_at?: string;
        };
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          stripe_customer_id: string;
          stripe_subscription_id: string;
          status: 'active' | 'canceled' | 'past_due' | 'trialing';
          plan: 'pro_monthly' | 'pro_yearly';
          current_period_end: string;
          created_at: string;
        };
      };
    };
  };
};

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function getSupabaseClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env['NEXT_PUBLIC_SUPABASE_URL']!,
      process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']!
    );
  }
  return client;
}
