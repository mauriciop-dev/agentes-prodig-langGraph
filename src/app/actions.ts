
'use server';

import { createServerSupabaseAdmin } from '@/lib/supabase/supabase-client';
import { ChatMessage, Database, SessionData, ActionResponse, A2UIResponse } from '@/lib/types';

export async function createSession(userId: string): Promise<ActionResponse<SessionData>> {
  try {
    const supabase = createServerSupabaseAdmin();
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[4][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const finalUserId = uuidRegex.test(userId) ? userId : '00000000-0000-4000-8000-000000000000';

    const { data: newSession, error: dbError } = await (supabase.from('sessions') as any)
      .insert({
        user_id: finalUserId,
        chat_history: [],
        current_state: 'WAITING_FOR_INFO',
        research_counter: 0,
        research_results: [],
      })
      .select()
      .single();

    if (dbError) return { success: false, error: dbError.message };
    return { success: true, data: newSession as SessionData };
  } catch (error: any) {
    console.error("Server Action Error:", error);
    if (error.message?.includes('fetch failed')) {
      return { success: false, error: "Error de conexión en el servidor (fetch failed). Verifica que NEXT_PUBLIC_SUPABASE_URL sea correcta y accesible desde el servidor." };
    }
    return { success: false, error: error.message };
  }
}
