'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/supabase-client';
import { SessionData, ChatMessage } from '@/lib/types';
import { runConsultancyFlow } from '@/app/actions';

interface ChatUIProps {
  sessionId: string;
  initialSession: SessionData;
}

const ChatUI: React.FC<ChatUIProps> = ({ sessionId, initialSession }) => {
  const [sessionData, setSessionData] = useState<SessionData>(initialSession);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createBrowserSupabaseClient();

  // Scroll to bottom on new messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionData.chat_history]);

  // Realtime Subscription
  useEffect(() => {
    const channel = supabase
      .channel('schema-db-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sessions',
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          setSessionData(payload.new as SessionData);
          if (payload.new.current_state === 'FINISHED') {
            setIsSending(false);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isSending) return;

    // Optimistic UI could go here, but we rely on Realtime for accuracy in this multi-agent setup
    setIsSending(true);
    const msg = inputValue;
    setInputValue('');

    try {
      await runConsultancyFlow(sessionId, msg);
    } catch (err) {
      console.error('Error triggering flow:', err);
      setIsSending(false);
    }
  };

  // Status Indicator helper
  const getStatusText = (state: string) => {
    switch (state) {
      case 'WAITING_FOR_INFO': return 'Esperando información...';
      case 'START_RESEARCH': return 'Pedro está investigando...';
      case 'DECIDE_FLOW': return 'Analizando profundidad...';
      case 'START_REPORT': return 'Juan está redactando el reporte...';
      case 'FINISHED': return 'Consultoría Finalizada.';
      default: return 'Procesando...';
    }
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200">
      
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-white font-bold text-lg">Consultores Empresariales IA</h2>
          <p className="text-gray-400 text-xs uppercase tracking-wider">Sistema Multi-Agente</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${sessionData.current_state === 'FINISHED' ? 'bg-green-500' : 'bg-cyan-500 animate-pulse'}`}></span>
          <span className="text-cyan-100 text-xs font-mono">
            {getStatusText(sessionData.current_state)}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
        {sessionData.chat_history.length === 0 && (
          <div className="text-center text-gray-400 mt-20">
            <p className="text-lg">Bienvenido.</p>
            <p className="text-sm">Por favor, describe tu empresa o pega una URL para comenzar el análisis.</p>
          </div>
        )}

        {sessionData.chat_history.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isPedro = msg.role === 'pedro';
          const isJuan = msg.role === 'juan';

          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-5 rounded-xl text-sm leading-relaxed shadow-sm relative ${
                  isUser
                    ? 'bg-white border border-gray-200 text-gray-800'
                    : isPedro
                    ? 'bg-emerald-50 text-gray-800 border-l-4 border-emerald-500'
                    : isJuan
                    ? 'bg-sky-50 text-gray-800 border-l-4 border-sky-500'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {!isUser && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                        isPedro ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'
                    }`}>
                      {isPedro ? 'Ing. Pedro (IA)' : 'Juan (PM)'}
                    </span>
                  </div>
                )}
                <div className="whitespace-pre-wrap markdown-body">
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-4">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sessionData.current_state !== 'WAITING_FOR_INFO' && sessionData.current_state !== 'FINISHED'}
            placeholder={
                sessionData.current_state === 'FINISHED' 
                ? "La sesión ha finalizado. Refresca para comenzar de nuevo." 
                : sessionData.current_state !== 'WAITING_FOR_INFO'
                ? "Los agentes están trabajando..."
                : "Describe tu empresa o problema..."
            }
            className="flex-1 p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || (sessionData.current_state !== 'WAITING_FOR_INFO' && sessionData.current_state !== 'FINISHED')}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            Enviar
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatUI;
