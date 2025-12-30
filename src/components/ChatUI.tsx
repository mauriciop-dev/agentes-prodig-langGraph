
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/supabase-client';
import { SessionData, ChatMessage, A2UIResponse } from '@/lib/types';
import { runConsultancyFlow } from '@/app/actions';
import { marked } from 'marked';
import { BusinessForm } from './A2UI/BusinessForm';
import { ImpactChart } from './A2UI/ImpactChart';
import { ProposalCard } from './A2UI/ProposalCard';
import { StepProcess } from './A2UI/StepProcess';

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

  useEffect(() => {
    marked.setOptions({ breaks: true, gfm: true });
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
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` }, (payload) => {
          setSessionData(payload.new as SessionData);
          if (payload.new.current_state === 'FINISHED') setIsSending(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || isSending) return;
    setIsSending(true);
    
    // Optimistic Update
    const userMsg: ChatMessage = { role: 'user', content: msg, timestamp: Date.now() };
    setSessionData(prev => ({ ...prev, chat_history: [...prev.chat_history, userMsg] }));

    try {
      const response = await runConsultancyFlow(sessionId, msg);
      if (response.success && response.data) {
        setSessionData(response.data);
      } else {
        const errorMsg: ChatMessage = { role: 'system', content: `Error: ${response.error || "Error de comunicación."}`, timestamp: Date.now() };
        setSessionData(prev => ({ ...prev, chat_history: [...prev.chat_history, errorMsg] }));
      }
    } catch (err) {
      console.error('Error triggering flow:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(inputValue);
    setInputValue('');
  };

  const handleFormSubmit = (data: Record<string, string>) => {
    const formattedData = Object.entries(data).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n');
    sendMessage(`FORM_SUBMISSION:\n${formattedData}`);
  };

  const renderMessageContent = (content: string) => {
    let a2ui: A2UIResponse | null = null;
    try {
      if (content.startsWith('{')) {
        a2ui = JSON.parse(content);
      }
    } catch (e) {
      // Fallback to text if not valid JSON
    }

    const messageText = a2ui ? a2ui.message : content;
    const html = marked.parse(messageText);

    return (
      <div className="w-full">
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html as string }} />
        {a2ui?.componentName === 'BusinessForm' && (
          <BusinessForm 
            title={a2ui.data.title} 
            fields={a2ui.data.fields} 
            onSubmit={handleFormSubmit} 
            disabled={isSending}
          />
        )}
        {a2ui?.componentName === 'ImpactChart' && (
          <ImpactChart {...a2ui.data} />
        )}
        {a2ui?.componentName === 'ProposalCard' && (
          <ProposalCard {...a2ui.data} />
        )}
        {a2ui?.componentName === 'StepProcess' && (
          <StepProcess {...a2ui.data} />
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
      <div className="bg-gray-950 p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
        <div>
          <h2 className="text-white font-bold text-lg tracking-tight">Consultores Empresariales <span className="text-cyan-400">IA</span></h2>
          <p className="text-gray-500 text-[10px] uppercase font-black tracking-widest">A2UI GENERATIVE INTERFACE v2.0</p>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
          <span className={`h-2 w-2 rounded-full ${sessionData.current_state === 'FINISHED' ? 'bg-green-500' : 'bg-cyan-500 animate-pulse'}`}></span>
          <span className="text-cyan-100 text-[10px] font-mono font-bold uppercase">
            {sessionData.current_state}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50 space-y-8">
        {sessionData.chat_history.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isPedro = msg.role === 'pedro';
          const isJuan = msg.role === 'juan';

          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[90%] p-6 rounded-2xl shadow-sm border ${
                  isUser ? 'bg-white border-slate-200 text-slate-700' :
                  isPedro ? 'bg-emerald-50/50 border-emerald-100' :
                  isJuan ? 'bg-sky-50/50 border-sky-100' : 'bg-red-50 text-red-600'
                }`}>
                {!isUser && msg.role !== 'system' && (
                  <div className="mb-4 flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-md shadow-sm border ${
                        isPedro ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-sky-500 text-white border-sky-400'
                    }`}>
                      {isPedro ? '🤖 ING. PEDRO (TECNOLOGÍA)' : '💼 ESTRATEGA JUAN (PM)'}
                    </span>
                  </div>
                )}
                {renderMessageContent(msg.content)}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-slate-200 shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending || sessionData.current_state === 'FINISHED'}
            placeholder={isSending ? "Agentes procesando..." : "Escribe tu consulta aquí..."}
            className="flex-1 p-3.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-600 outline-none disabled:bg-slate-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending || sessionData.current_state === 'FINISHED'}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50"
          >
            {isSending ? "..." : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatUI;
