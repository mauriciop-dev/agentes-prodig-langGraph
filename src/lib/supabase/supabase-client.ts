import { createClient } from '@supabase/supabase-js';
import { Database } from '../types';

// Client-side Supabase client (Singleton-ish pattern for client usage)
// Uses public Anon key. Safe for browser.
export const createBrowserSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables for client.');
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey);
};

// Server-side Supabase client (Service Role)
// Uses private Service Role key. ONLY use in Server Actions / API Routes.
// Bypasses RLS (Row Level Security).
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
