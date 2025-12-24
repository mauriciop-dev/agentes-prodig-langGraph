'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/supabase-client';
import { SessionData, ChatMessage } from '@/lib/types';
import { runConsultancyFlow } from '@/app/actions';
import { marked } from 'marked';

interface ChatUIProps {
  sessionId: string;
  initialSession: SessionData;
}

const ChatUI: React.FC<ChatUIProps> = ({ sessionId, initialSession }) => {
  const [sessionData, setSessionData] = useState<SessionData>(initialSession);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [supabase] = useState(() => createBrowserSupabaseClient());

  // Configurar marked para seguridad y saltos de línea
  useEffect(() => {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [sessionData.chat_history]);

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

    setIsSending(true);
    const msg = inputValue;
    setInputValue('');

    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() };
    setSessionData(prev => ({
      ...prev,
      chat_history: [...prev.chat_history, userMsg]
    }));

    try {
      const response = await runConsultancyFlow(sessionId, msg);
      
      if (response.success && response.data) {
        setSessionData(response.data);
        if (response.data.current_state === 'FINISHED') {
          setIsSending(false);
        }
      } else {
        const errorMsg: ChatMessage = { 
          role: 'system', 
          content: `Error: ${response.error || "Error de comunicación."}`, 
          timestamp: Date.now() 
        };
        setSessionData(prev => ({
          ...prev,
          chat_history: [...prev.chat_history, errorMsg]
        }));
        setIsSending(false);
      }
    } catch (err) {
      console.error('Error triggering flow:', err);
      setIsSending(false);
    }
  };

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

  // Función para renderizar el contenido de forma segura
  const renderMessageContent = (content: string) => {
    try {
      const html = marked.parse(content);
      return { __html: html };
    } catch (e) {
      return { __html: content };
    }
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-4xl mx-auto bg-white shadow-2xl rounded-xl overflow-hidden border border-gray-200">
      
      {/* Header */}
      <div className="bg-gray-900 p-4 border-b border-gray-800 flex justify-between items-center">
        <div>
          <h2 className="text-white font-bold text-lg">Consultores Empresariales IA</h2>
          <p className="text-gray-400 text-xs uppercase tracking-wider">Pedro & Juan Consulting</p>
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
          <div className="text-center text-gray-400 mt-20 flex flex-col items-center">
            <div className="bg-gray-200 p-4 rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path>
              </svg>
            </div>
            <p className="text-lg font-medium text-gray-600">Bienvenido a la Consultoría IA</p>
            <p className="text-sm max-w-xs">Describe tu empresa o proporciona una URL para que Pedro y Juan comiencen el análisis.</p>
          </div>
        )}

        {sessionData.chat_history.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isPedro = msg.role === 'pedro';
          const isJuan = msg.role === 'juan';
          const isSystem = msg.role === 'system';

          return (
            <div
              key={idx}
              className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-5 rounded-xl text-sm leading-relaxed shadow-sm relative ${
                  isUser
                    ? 'bg-white border border-gray-200 text-gray-800'
                    : isPedro
                    ? 'bg-emerald-50 text-gray-800 border-l-4 border-emerald-500'
                    : isJuan
                    ? 'bg-sky-50 text-gray-800 border-l-4 border-sky-500'
                    : 'bg-red-50 text-red-600 border border-red-200'
                }`}
              >
                {!isUser && !isSystem && (
                  <div className="mb-2 flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded shadow-sm ${
                        isPedro ? 'bg-emerald-500 text-white' : 'bg-sky-500 text-white'
                    }`}>
                      {isPedro ? 'ING. PEDRO' : 'JUAN (STRATEGY)'}
                    </span>
                  </div>
                )}
                <div 
                  className="markdown-body"
                  dangerouslySetInnerHTML={renderMessageContent(msg.content)}
                />
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={sessionData.current_state !== 'WAITING_FOR_INFO' && sessionData.current_state !== 'FINISHED'}
            placeholder={
                sessionData.current_state === 'FINISHED' 
                ? "Consulta terminada. Refresca para iniciar otra." 
                : isSending 
                ? "Los agentes están procesando tu solicitud..."
                : "Ej: Somos una startup de logística en México buscando optimizar rutas..."
            }
            className="flex-1 p-3.5 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-600 focus:border-transparent transition-all disabled:bg-gray-100 disabled:text-gray-400"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending || (sessionData.current_state !== 'WAITING_FOR_INFO' && sessionData.current_state !== 'FINISHED')}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-7 py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md active:scale-95"
          >
            {isSending ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Analizando...</span>
              </div>
            ) : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatUI;