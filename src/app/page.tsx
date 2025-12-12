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
  
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        let userId: string;

        // 1. Try Anonymous Auth
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) {
          console.warn("Auth Anónimo no disponible. Fallback UUID.", authError.message);
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            userId = crypto.randomUUID();
          } else {
             userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
          }
        } else {
          userId = authData.user?.id || crypto.randomUUID();
        }

        // 2. Create Session (Server Action)
        const response = await createSession(userId);

        if (!mounted) return;

        if (!response.success || !response.data) {
          throw new Error(response.error || "Falló la creación de sesión sin mensaje específico.");
        }

        setSessionData(response.data);
        setSessionId(response.data.id);
      } catch (err: any) {
        console.error("Initialization Error:", err);
        if (mounted) {
          setErrorMsg(err.message || "Error desconocido al iniciar sesión.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initSession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-600 mb-4"></div>
        <p className="text-gray-500 font-medium">Iniciando sistema...</p>
      </div>
    );
  }

  if (errorMsg || !sessionId || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center border-l-4 border-red-500">
          <h3 className="text-xl font-bold text-gray-800 mb-2">Error de Inicialización</h3>
          <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-6 text-left overflow-auto max-h-48 text-sm">
            <p className="font-bold mb-1">Detalle del error:</p>
            <p>{errorMsg}</p>
          </div>
          
          <div className="text-left bg-gray-100 p-4 rounded text-xs text-gray-500 mb-6">
             <p className="font-bold">Guía de Solución:</p>
             <ul className="list-disc pl-4 space-y-1 mt-1">
               <li>Si el error menciona <code>SUPABASE_SERVICE_ROLE_KEY</code>, agrégala en las variables de entorno de Vercel (Settings &gt; Environment Variables).</li>
               <li>Si el error menciona <code>Database Error</code>, verifica que la tabla <code>sessions</code> existe en Supabase.</li>
               <li>Si el error menciona <code>Auth Error</code>, habilita "Anonymous Sign-ins" en Supabase Auth Settings.</li>
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