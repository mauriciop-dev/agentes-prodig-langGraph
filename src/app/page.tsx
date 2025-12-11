'use client';

import React, { useEffect, useState } from 'react';
import ChatUI from '@/components/ChatUI';
import { createBrowserSupabaseClient } from '@/lib/supabase/supabase-client';
import { SessionData } from '@/lib/types';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const initSession = async () => {
      try {
        // 1. Anonymous Auth
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) throw authError;
        const userId = authData.user?.id;

        if (!userId) throw new Error("No user ID generated");

        // 2. Create a new Session Record in DB
        // In a real app, we might check if a query param has a session ID to resume.
        // Here we create a fresh one for the demo.
        const { data: newSession, error: dbError } = await supabase
          .from('sessions')
          .insert({
            user_id: userId,
            chat_history: [],
            current_state: 'WAITING_FOR_INFO',
            research_counter: 0,
            research_results: [],
          })
          .select()
          .single();

        if (dbError) throw dbError;

        setSessionData(newSession as SessionData);
        setSessionId(newSession.id);
      } catch (err) {
        console.error("Initialization Error:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Inicializando sistema seguro...</p>
      </div>
    );
  }

  if (!sessionId || !sessionData) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Error al conectar con el servidor de sesiones.
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <ChatUI sessionId={sessionId} initialSession={sessionData} />
    </main>
  );
}
