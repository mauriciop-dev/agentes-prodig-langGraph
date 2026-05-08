
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/supabase-client';
import { SessionData, ChatMessage, A2UIResponse } from '@/lib/types';
import { marked } from 'marked';
import { GoogleGenAI } from "@google/genai";
import { BusinessForm } from './A2UI/BusinessForm';
import { ImpactChart } from './A2UI/ImpactChart';
import { ProposalCard } from './A2UI/ProposalCard';
import { StepProcess } from './A2UI/StepProcess';
import { ComparativeTable } from './A2UI/ComparativeTable';
import { PriorityMatrix } from './A2UI/PriorityMatrix';
import { InteractiveROICalculator } from './A2UI/InteractiveROICalculator';
import { TechStackGrid } from './A2UI/TechStackGrid';
import { SWOTAnalysis } from './A2UI/SWOTAnalysis';
import { GanttMiniTimeline } from './A2UI/GanttMiniTimeline';
import { TestimonialCard } from './A2UI/TestimonialCard';
import { RiskAssessment } from './A2UI/RiskAssessment';

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
  const ai = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY! });

  const PROTOCOL_INSTRUCTION = `
REGLA CRÍTICA DE SALIDA: Debes responder EXCLUSIVAMENTE en formato JSON.
Formato:
{
  "message": "[Texto persuasivo en Markdown]",
  "componentName": "[NombreDelComponente | null]",
  "data": { [Objeto con los datos específicos] }
}

Componentes Disponibles:
1. BusinessForm: data: { "title": string, "fields": string[] }
2. ImpactChart: data: { "title": string, "labels": string[], "values": number[], "unit": string }
3. ProposalCard: data: { "title": string, "roi": string, "cost": string, "features": string[] }
4. StepProcess: data: { "steps": string[], "currentStep": number }
5. ComparativeTable: data: { "title": string, "rows": [{ "label": string, "before": string, "after": string }] }
6. PriorityMatrix: data: { "title": string, "items": [{ "name": string, "impact": number, "difficulty": number }] } (valores 0-100)
7. InteractiveROICalculator: data: { "title": string, "hourlyRate": number, "hoursLost": number, "efficiencyGain": number }
8. TechStackGrid: data: { "title": string, "stack": [{ "name": string, "category": string }] }
9. SWOTAnalysis: data: { "strengths": string[], "weaknesses": string[], "opportunities": string[], "threats": string[] }
10. GanttMiniTimeline: data: { "title": string, "phases": [{ "name": string, "start": number, "duration": number }] } (semanas)
11. TestimonialCard: data: { "client": string, "quote": string, "result": string }
12. RiskAssessment: data: { "risks": [{ "name": string, "level": "low"|"medium"|"high", "description": string }] }

ELIGE EL COMPONENTE QUE MEJOR SE ADAPTE AL MOMENTO DE LA CONVERSACIÓN.
`;

  const PEDRO_SYSTEM_PROMPT = `
Eres Pedro, Consultor de IA Senior. Tu color es el ESMERALDA/VERDE. Eres técnico, preciso y analítico.
Tu objetivo es identificar oportunidades de automatización y eficiencia técnica.
Usa ImpactChart, RiskAssessment o TechStackGrid para sustentar tus hallazgos.
${PROTOCOL_INSTRUCTION}
`;

  const JUAN_SYSTEM_PROMPT = `
Eres Juan, Ingeniero y Estratega de Negocios. Tu color es el CIELO/AZUL. Eres ejecutivo, empático y enfocado en el ROI.
Tu objetivo es transformar la técnica en valor de negocio.
Al finalizar tus informes, pregunta siempre si el usuario desea profundizar en algo más y SUGIERE 2 o 3 herramientas específicas que tenemos disponibles como:
- "Simular el ahorro real con nuestra **Calculadora de ROI**"
- "Priorizar tareas con una **Matriz de Impacto**"
- "Ver el cronograma detallado en el **Gantt Timeline**"
- "Realizar un **Análisis FODA (SWOT)** de la implementación"
- "Ver una **Tabla Comparativa** de antes vs después"

Usa ComparativeTable, InteractiveROICalculator, SWOTAnalysis, GanttMiniTimeline o ProposalCard según sea necesario.
${PROTOCOL_INSTRUCTION}
`;

  function cleanAndParseJSON(text: string): A2UIResponse {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.message) return parsed;
      }
      return { message: text };
    } catch (e) {
      return { message: text };
    }
  }

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
    if (!sessionId) return;
    
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'sessions', 
        filter: `id=eq.${sessionId}` 
      }, (payload) => {
          setSessionData(payload.new as SessionData);
          if (payload.new.current_state === 'FINISHED') setIsSending(false);
      })
      .subscribe();
      
    return () => { supabase.removeChannel(channel); };
  }, [sessionId, supabase]);

  const sendMessage = async (msg: string) => {
    if (!msg.trim() || isSending) return;
    setIsSending(true);
    
    let currentHistory = [...sessionData.chat_history, { role: 'user', content: msg, timestamp: Date.now() }];
    let researchResults = [...(sessionData.research_results || [])];
    let currentState = sessionData.current_state;
    let reportFinal = sessionData.report_final;

    setSessionData(prev => ({ ...prev, chat_history: currentHistory }));

    try {
      // Update DB with user message immediately
      await supabase.from('sessions').update({ chat_history: currentHistory }).eq('id', sessionId);

      if (currentHistory.filter(m => m.role === 'user').length === 1) {
        const juanIntro = {
          message: "¡Hola! Soy **Juan**, Ingeniero y Estratega de Negocios. Mi misión es asegurar que cada tecnología se convierta en un motor de crecimiento real para tu empresa.",
          componentName: null,
          data: {}
        };
        const pedroIntro = {
          message: "Y yo soy **Pedro**, Consultor de IA. Juntos vamos a ayudarte a decidir en qué parte de tu empresa o proyecto puedes implementar IA y automatizaciones.\n\nPara empezar, solo tenemos unas preguntas iniciales para conocerte mejor. ¿Estás listo? Escribe **'si'** o **'listo'**.",
          componentName: null,
          data: {}
        };

        currentHistory.push({ role: 'juan', content: JSON.stringify(juanIntro), timestamp: Date.now() });
        currentHistory.push({ role: 'pedro', content: JSON.stringify(pedroIntro), timestamp: Date.now() });
        await supabase.from('sessions').update({ chat_history: currentHistory }).eq('id', sessionId);
      } 
      else if (currentState === 'WAITING_FOR_INFO' && 
               (msg.toLowerCase().includes('si') || msg.toLowerCase().includes('listo'))) {
        
        const formResponse = {
          message: "Excelente. Por favor, completa este breve diagnóstico para que podamos analizar tu caso con precisión técnica.",
          componentName: 'BusinessForm',
          data: {
            title: "Diagnóstico de Potencial IA",
            fields: ["nombre_empresa", "sector_industria", "numero_empleados", "problema_ia_a_resolver"]
          }
        };
        
        currentHistory.push({ role: 'pedro', content: JSON.stringify(formResponse), timestamp: Date.now() });
        currentState = 'START_RESEARCH';
        await supabase.from('sessions').update({ 
          chat_history: currentHistory, 
          current_state: currentState 
        }).eq('id', sessionId);
      }
      else if (currentState === 'START_RESEARCH' || currentState === 'FINISHED') {
        // CALL AI FROM CLIENT
        const pedroModel = 'gemini-3-flash-preview';
        
        const pedroAnalysis = await ai.models.generateContent({
          model: pedroModel,
          config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
          contents: `Información del usuario: ${msg}. Contexto previo: ${JSON.stringify(researchResults)}. 
          Realiza un análisis profundo y elige el componente más adecuado (ImpactChart, RiskAssessment, TechStackGrid o PriorityMatrix).`,
        });
        const pData = cleanAndParseJSON(pedroAnalysis.text || '');
        researchResults.push(pData.message);
        currentHistory.push({ role: 'pedro', content: JSON.stringify(pData), timestamp: Date.now() });
        
        const juanAnalysis = await ai.models.generateContent({
          model: pedroModel,
          config: { systemInstruction: JUAN_SYSTEM_PROMPT },
          contents: `Hallazgos de Pedro: ${JSON.stringify(researchResults)}. 
          Tarea: Crea la estrategia de negocio. Usa ComparativeTable, InteractiveROICalculator, SWOTAnalysis, GanttMiniTimeline o ProposalCard. 
          Al final, pregunta si hay dudas y sugiere explícitamente profundizar con alguna de las otras herramientas (Matriz, Calculadora, SWOT, etc). No olvides invitar al contacto a ProDig al 3144897092.`,
        });
        const jData = cleanAndParseJSON(juanAnalysis.text || '');
        
        if (!jData.message.includes('3144897092')) {
          jData.message += "\n\n---\n¿Dudas? Contacta a **ProDig** al **3144897092**.";
        }

        currentHistory.push({ role: 'juan', content: JSON.stringify(jData), timestamp: Date.now() });
        currentState = 'FINISHED';
        reportFinal = jData.message;

        await supabase.from('sessions').update({ 
          chat_history: currentHistory, 
          research_results: researchResults,
          current_state: currentState,
          report_final: reportFinal
        }).eq('id', sessionId);
      }

    } catch (err: any) {
      console.error('Error triggering flow:', err);
      const errorMsg: ChatMessage = { role: 'system', content: `**Error:** ${err.message || "Ocurrió un problema técnico."}`, timestamp: Date.now() };
      setSessionData(prev => ({ ...prev, chat_history: [...prev.chat_history, errorMsg] }));
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
    const formattedData = Object.entries(data)
      .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
      .join(' | ');
    sendMessage(`He completado el diagnóstico: ${formattedData}`);
  };

  const renderMessageContent = (content: string) => {
    let a2ui: A2UIResponse | null = null;
    try {
      if (content.trim().startsWith('{')) {
        a2ui = JSON.parse(content);
      }
    } catch (e) {
      // Not JSON
    }

    const messageText = a2ui?.message || content;
    const html = marked.parse(messageText);

    return (
      <div className="w-full">
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html as string }} />
        {a2ui?.componentName === 'BusinessForm' && a2ui.data && (
          <BusinessForm {...a2ui.data} onSubmit={handleFormSubmit} disabled={isSending} />
        )}
        {a2ui?.componentName === 'ImpactChart' && a2ui.data && <ImpactChart {...a2ui.data} />}
        {a2ui?.componentName === 'ProposalCard' && a2ui.data && <ProposalCard {...a2ui.data} />}
        {a2ui?.componentName === 'StepProcess' && a2ui.data && <StepProcess {...a2ui.data} />}
        {a2ui?.componentName === 'ComparativeTable' && a2ui.data && <ComparativeTable {...a2ui.data} />}
        {a2ui?.componentName === 'PriorityMatrix' && a2ui.data && <PriorityMatrix {...a2ui.data} />}
        {a2ui?.componentName === 'InteractiveROICalculator' && a2ui.data && <InteractiveROICalculator {...a2ui.data} />}
        {a2ui?.componentName === 'TechStackGrid' && a2ui.data && <TechStackGrid {...a2ui.data} />}
        {a2ui?.componentName === 'SWOTAnalysis' && a2ui.data && <SWOTAnalysis {...a2ui.data} />}
        {a2ui?.componentName === 'GanttMiniTimeline' && a2ui.data && <GanttMiniTimeline {...a2ui.data} />}
        {a2ui?.componentName === 'TestimonialCard' && a2ui.data && <TestimonialCard {...a2ui.data} />}
        {a2ui?.componentName === 'RiskAssessment' && a2ui.data && <RiskAssessment {...a2ui.data} />}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[85vh] max-w-5xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden border border-gray-200">
      <div className="bg-gray-950 p-4 border-b border-gray-800 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center text-white font-bold text-xs">P</div>
            <div className="w-8 h-8 rounded-full bg-sky-500 border-2 border-gray-950 flex items-center justify-center text-white font-bold text-xs">J</div>
          </div>
          <div>
            <h2 className="text-white font-bold text-sm sm:text-lg tracking-tight leading-none">Consultores <span className="text-cyan-400">ProDig</span></h2>
            <p className="text-gray-500 text-[9px] uppercase font-black tracking-widest mt-1">Socio Tecnológico IA</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-gray-900 px-3 py-1.5 rounded-full border border-gray-800">
          <span className={`h-2 w-2 rounded-full ${sessionData.current_state === 'FINISHED' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-cyan-500 animate-pulse shadow-[0_0_8px_rgba(6,182,212,0.6)]'}`}></span>
          <span className="text-cyan-100 text-[10px] font-mono font-bold uppercase hidden sm:inline">
            {sessionData.current_state.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50 space-y-6">
        {sessionData.chat_history.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-60">
            <div className="p-4 bg-white rounded-full shadow-inner border border-slate-200">
              <svg className="w-12 h-12 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <div>
              <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Escribe algo para comenzar</p>
              <p className="text-slate-400 text-[11px]">Juan y Pedro están listos para tu diagnóstico.</p>
            </div>
          </div>
        )}

        {sessionData.chat_history.map((msg, idx) => {
          const isUser = msg.role === 'user';
          const isPedro = msg.role === 'pedro';
          const isJuan = msg.role === 'juan';

          return (
            <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
              <div className={`max-w-[90%] p-4 sm:p-6 rounded-2xl shadow-sm border transition-all duration-300 ${
                  isUser ? 'bg-white border-slate-200 text-slate-700 ml-4 sm:ml-12' :
                  isPedro ? 'bg-emerald-50/70 border-emerald-100 mr-4 sm:mr-12' :
                  isJuan ? 'bg-sky-50/70 border-sky-100 mr-4 sm:mr-12' : 'bg-red-50 text-red-600 border-red-200'
                }`}>
                {!isUser && msg.role !== 'system' && (
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md shadow-sm border ${
                        isPedro ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-sky-500 text-white border-sky-400'
                    }`}>
                      {isPedro ? '🤖 ING. PEDRO (IA)' : '💼 ESTRATEGA JUAN'}
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
        <form onSubmit={handleSubmit} className="flex gap-2 sm:gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isSending}
            placeholder={isSending ? "Nuestras IAs están debatiendo..." : "Escribe 'si', 'listo' o tu consulta..."}
            className="flex-1 p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-600 outline-none disabled:bg-slate-50 transition-all shadow-inner text-sm"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isSending}
            className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 sm:px-8 py-3 rounded-xl transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSending ? (
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            ) : "Enviar"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatUI;
