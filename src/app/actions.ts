
'use server';

import { GoogleGenAI } from "@google/genai";
import { createServerSupabaseAdmin } from '@/lib/supabase/supabase-client';
import { ChatMessage, Database, SessionData, ActionResponse, A2UIResponse } from '@/lib/types';

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const PROTOCOL_INSTRUCTION = `
REGLA CRÍTICA DE SALIDA: Debes responder EXCLUSIVAMENTE en formato JSON.
Formato:
{
  "message": "[Texto persuasivo en Markdown]",
  "componentName": "[BusinessForm | ImpactChart | ProposalCard | StepProcess | null]",
  "data": { [Objeto con los datos específicos] }
}

Reglas por Componente:
- BusinessForm: "title" (string), "fields" (array de STRINGS). IMPORTANTE: Los elementos de "fields" deben ser nombres cortos de campos (ej: "nombre_empresa"). No olvides incluir "problema_a_resolver_con_ia".
- ImpactChart: "title" (string), "labels" (array strings), "values" (array números), "unit" (string).
- ProposalCard: "title" (string), "roi" (string), "cost" (string), "features" (array strings).
- StepProcess: "steps" (array strings), "currentStep" (número).
`;

const PEDRO_SYSTEM_PROMPT = `
Eres Pedro, Ingeniero IA Senior. Eres analítico y técnico.
Tu objetivo: Diagnosticar la viabilidad técnica y proponer automatizaciones.
${PROTOCOL_INSTRUCTION}
`;

const JUAN_SYSTEM_PROMPT = `
Eres Juan, Estratega de Negocios y PM. Eres ejecutivo y enfocado en ROI.
Tu objetivo: Transformar hallazgos técnicos en planes de negocio y roadmaps.
${PROTOCOL_INSTRUCTION}
`;

function cleanAndParseJSON(text: string): A2UIResponse {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validación mínima de estructura
      if (parsed.message) return parsed;
    }
    return { message: text };
  } catch (e) {
    console.warn("Error parseando respuesta IA:", text);
    return { message: text };
  }
}

export async function createSession(userId: string): Promise<ActionResponse<SessionData>> {
  try {
    const supabase = createServerSupabaseAdmin();
    
    // Verificar si userId es un UUID válido para evitar error 422
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

    if (dbError) {
      console.error("DB Error:", dbError);
      return { success: false, error: dbError.message };
    }
    return { success: true, data: newSession as SessionData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function runConsultancyFlow(sessionId: string, userMessage: string): Promise<ActionResponse<SessionData>> {
  try {
    const supabase = createServerSupabaseAdmin();
    const ai = getAI();

    const { data: rawSession, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    if (error || !rawSession) return { success: false, error: 'Sesión no encontrada.' };

    const dbSession = rawSession as any;
    const session: SessionData = {
      id: dbSession.id,
      user_id: dbSession.user_id,
      chat_history: dbSession.chat_history as unknown as ChatMessage[],
      company_info: dbSession.company_info,
      research_results: (dbSession.research_results as unknown as string[]) || [],
      report_final: dbSession.report_final,
      current_state: dbSession.current_state as any,
      research_counter: dbSession.research_counter
    };

    const updateDB = async (updates: any) => {
      await (supabase.from('sessions') as any).update(updates).eq('id', sessionId);
    };

    let currentHistory = session.chat_history || [];
    let researchResults = session.research_results || [];

    // 1. Agregar mensaje de usuario
    currentHistory = [...currentHistory, { role: 'user', content: userMessage, timestamp: Date.now() }];
    await updateDB({ chat_history: currentHistory });

    // Lógica de agentes según el estado
    if (session.current_state === 'WAITING_FOR_INFO' && currentHistory.length === 1) {
      const pedroResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
        contents: `Preséntate brevemente y solicita los datos de la empresa. Usa el BusinessForm para preguntar: nombre, sector, tamaño y el problema específico que quieren resolver con IA.`,
      });
      const pedroData = cleanAndParseJSON(pedroResponse.text || '');
      currentHistory.push({ role: 'pedro', content: JSON.stringify(pedroData), timestamp: Date.now() });
      await updateDB({ chat_history: currentHistory });
    } 
    else {
      // Flujo de Análisis
      if (session.current_state === 'WAITING_FOR_INFO') {
        await updateDB({ company_info: userMessage, current_state: 'START_RESEARCH' });
      }

      const pedroAnalysis = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
        contents: `Analiza esta información: ${userMessage}. Genera un ImpactChart mostrando la mejora proyectada en eficiencia.`,
      });
      const pData = cleanAndParseJSON(pedroAnalysis.text || '');
      researchResults.push(pData.message);
      currentHistory.push({ role: 'pedro', content: JSON.stringify(pData), timestamp: Date.now() });
      
      const juanReport = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: JUAN_SYSTEM_PROMPT },
        contents: `Hallazgos técnicos: ${JSON.stringify(researchResults)}. Genera el plan estratégico final. Usa StepProcess para el roadmap y ProposalCard para la oferta final.`,
      });
      const jData = cleanAndParseJSON(juanReport.text || '');
      currentHistory.push({ role: 'juan', content: JSON.stringify(jData), timestamp: Date.now() });

      await updateDB({ 
        chat_history: currentHistory, 
        research_results: researchResults,
        current_state: 'FINISHED',
        report_final: jData.message 
      });
    }

    const { data: finalSession } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    return { success: true, data: finalSession as unknown as SessionData };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
