
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

let browserClient: SupabaseClient<Database> | null = null;

// Client-side Supabase client (Singleton)
export const createBrowserSupabaseClient = () => {
  if (typeof window === 'undefined') return {} as SupabaseClient<Database>;
  
  if (!browserClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables for client.');
    }
    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
};

// Server-side Supabase client (Service Role)
export const createServerSupabaseAdmin = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase Service Role key for server action.');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
