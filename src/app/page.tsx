'use client';

import React, { useEffect, useState } from 'react';
import ChatUI from '@/components/ChatUI';
import { createBrowserSupabaseClient } from '@/lib/supabase/supabase-client';
import { SessionData } from '@/lib/types';
import { createSession } from '@/app/actions';

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const supabase = createBrowserSupabaseClient();

  useEffect(() => {
    const initSession = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        // 1. Anonymous Auth (Client Side)
        // Ensure "Enable Anonymous Sign-ins" is ON in Supabase Auth Settings
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) throw new Error(`Auth Error: ${authError.message}`);
        const userId = authData.user?.id;

        if (!userId) throw new Error("No user ID generated from Supabase Auth.");

        // 2. Create a new Session Record via Server Action
        // This bypasses RLS issues on the client side
        const newSession = await createSession(userId);

        setSessionData(newSession);
        setSessionId(newSession.id);
      } catch (err: any) {
        console.error("Initialization Error:", err);
        setErrorMsg(err.message || "Error desconocido al iniciar sesión.");
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
        <p className="text-gray-500 font-medium">Iniciando sistema seguro...</p>
      </div>
    );
  }

  if (errorMsg || !sessionId || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-l-4 border-red-500">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error de Conexión</h3>
          <p className="text-gray-600 mb-6">{errorMsg || "No se pudo conectar con el servidor de sesiones."}</p>
          
          <div className="text-left bg-gray-100 p-4 rounded text-xs font-mono text-gray-500 overflow-auto mb-6">
            <p>Posibles causas:</p>
            <ul className="list-disc pl-4 mt-2 space-y-1">
              <li>Variables de entorno (SUPABASE_URL, API_KEY) faltantes.</li>
              <li>Tabla 'sessions' no existe en Supabase.</li>
              <li>Autenticación Anónima desactivada en Supabase.</li>
            </ul>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="bg-cyan-600 text-white px-6 py-2 rounded-lg hover:bg-cyan-700 transition-colors w-full"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <ChatUI sessionId={sessionId} initialSession={sessionData} />
    </main>
  );
}