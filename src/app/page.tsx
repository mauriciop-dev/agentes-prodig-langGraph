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
  
  // FIX: Inicializar Supabase una sola vez usando useState con inicializador perezoso.
  // Esto evita que se cree una nueva instancia en cada render, rompiendo el bucle infinito del useEffect.
  const [supabase] = useState(() => createBrowserSupabaseClient());

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      try {
        setLoading(true);
        setErrorMsg(null);

        let userId: string;

        // 1. Intentar Auth Anónimo
        const { data: authData, error: authError } = await supabase.auth.signInAnonymously();
        
        if (authError) {
          console.warn("Auth Anónimo no disponible. Usando ID local fallback:", authError.message);
          // FALLBACK: Generar un UUID válido si falla Auth.
          // Usamos crypto.randomUUID() si está disponible para cumplir con tipos 'uuid' en DB.
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            userId = crypto.randomUUID();
          } else {
             // Fallback muy básico para navegadores antiguos (aunque Next.js suele tener polyfills)
             userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
          }
        } else {
          userId = authData.user?.id || crypto.randomUUID();
        }

        // 2. Crear Sesión en Servidor (Bypaseando RLS)
        const newSession = await createSession(userId);

        if (mounted) {
          setSessionData(newSession);
          setSessionId(newSession.id);
        }
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
          <p className="text-gray-600 mb-6">{errorMsg || "No se pudo conectar con el servidor."}</p>
          
          <div className="text-left bg-gray-100 p-4 rounded text-xs text-gray-500 mb-4 overflow-auto max-h-32">
             <p className="font-bold">Detalles:</p>
             {errorMsg?.includes('violates foreign key constraint') ? (
               <p>La base de datos requiere un usuario real (Foreign Key). La autenticación anónima está desactivada en Supabase y el ID generado localmente no existe en la tabla `auth.users`.</p>
             ) : (
               <p>{errorMsg}</p>
             )}
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