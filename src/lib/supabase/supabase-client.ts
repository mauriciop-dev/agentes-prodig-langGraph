
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

let browserClient: SupabaseClient<Database> | null = null;

// Client-side Supabase client (Singleton)
export const createBrowserSupabaseClient = () => {
  if (typeof window === 'undefined') return {} as SupabaseClient<Database>;
  
  if (!browserClient) {
    // Limpiar variables de espacios o saltos de línea accidentales
    const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const supabaseAnonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

    if (!supabaseUrl || supabaseUrl === 'undefined' || supabaseUrl === '' || supabaseUrl.includes('YOUR_SUPABASE_URL')) {
      throw new Error('La variable NEXT_PUBLIC_SUPABASE_URL está vacía o es inválida.');
    }
    if (!supabaseAnonKey || supabaseAnonKey === 'undefined' || supabaseAnonKey === '' || supabaseAnonKey.includes('YOUR_ANON_KEY')) {
      throw new Error('La variable NEXT_PUBLIC_SUPABASE_ANON_KEY está vacía o es inválida.');
    }
    
    if (!supabaseUrl.startsWith('https://')) {
      throw new Error('La URL de Supabase debe comenzar con https://. Valor actual detectado: "' + supabaseUrl + '"');
    }

    browserClient = createClient<Database>(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
};

// Server-side Supabase client (Service Role)
export const createServerSupabaseAdmin = () => {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseServiceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!supabaseUrl || supabaseUrl === 'undefined' || supabaseUrl === '') {
    throw new Error('Error en el servidor: NEXT_PUBLIC_SUPABASE_URL no configurada.');
  }
  if (!supabaseServiceKey || supabaseServiceKey === 'undefined' || supabaseServiceKey === '') {
    throw new Error('Error en el servidor: SUPABASE_SERVICE_ROLE_KEY no configurada.');
  }

  return createClient<Database>(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};
