
'use server';

import { GoogleGenAI } from "@google/genai";
import { createServerSupabaseAdmin } from '@/lib/supabase/supabase-client';
import { ChatMessage, Database, SessionData, ActionResponse, A2UIResponse } from '@/lib/types';

const getAI = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

const PROTOCOL_INSTRUCTION = `
IMPORTANT: You MUST always respond in the following JSON format. Do not include any text outside the JSON.
{
  "message": "[Your persuasive and professional message using markdown for formatting]",
  "componentName": "[ComponentName or leave empty if only message]",
  "data": { [Data required for the component] }
}
Available Components:
- BusinessForm: fields (array), title (string). (Include a field for 'IA Problem').
- ImpactChart: title, labels (array), values (array), unit.
- ProposalCard: title, roi, cost, features (array).
- StepProcess: steps (array), currentStep (number).
`;

const PEDRO_SYSTEM_PROMPT = `
Eres Pedro, un Ingeniero de IA Senior y Analista de Datos.
Tu tono es: Analítico, Técnico y Objetivo.
Tu tarea es diagnosticar y proponer soluciones técnicas de automatización.
${PROTOCOL_INSTRUCTION}
`;

const JUAN_SYSTEM_PROMPT = `
Eres Juan, Project Manager y Estratega de Negocios.
Tu tono es: Ejecutivo, Estratégico y Empático.
Tu tarea es presentar la solución final y el roadmap.
${PROTOCOL_INSTRUCTION}
`;

// Utility to clean LLM response and extract JSON
function cleanAndParseJSON(text: string): A2UIResponse {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return { message: text };
  } catch (e) {
    console.error("Failed to parse AI response as JSON", text);
    return { message: text };
  }
}

export async function createSession(userId: string): Promise<ActionResponse<SessionData>> {
  try {
    const supabase = createServerSupabaseAdmin();
    const { data: newSession, error: dbError } = await (supabase.from('sessions') as any)
      .insert({
        user_id: userId,
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
    return { success: false, error: error.message };
  }
}

export async function runConsultancyFlow(sessionId: string, userMessage: string): Promise<ActionResponse<SessionData>> {
  try {
    const supabase = createServerSupabaseAdmin();
    const ai = getAI();

    const { data: rawSession, error } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    if (error || !rawSession) return { success: false, error: 'Session not found.' };

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

    const updateState = async (updates: Partial<SessionData>) => {
      const { id, ...cleanUpdates } = updates as any;
      await (supabase.from('sessions') as any).update(cleanUpdates).eq('id', sessionId);
    };

    const appendMessage = async (msg: ChatMessage, currentHistory: ChatMessage[]) => {
      const newHistory = [...currentHistory, msg];
      await updateState({ chat_history: newHistory as any });
      return newHistory;
    };

    let currentHistory = session.chat_history || [];
    let researchResults = session.research_results || [];

    // 1. Append User Message
    currentHistory = await appendMessage({ role: 'user', content: userMessage, timestamp: Date.now() }, currentHistory);

    // Initial interaction: If empty history or first contact, Pedro asks for info via BusinessForm
    if (session.current_state === 'WAITING_FOR_INFO' && currentHistory.length === 1) {
      const pedroResponse = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
        contents: `Preséntate brevemente y pide los datos de la empresa usando el BusinessForm. Asegúrate de incluir la pregunta sobre qué problema creen que la IA puede solucionar.`,
      });
      const pedroData = cleanAndParseJSON(pedroResponse.text || '');
      currentHistory = await appendMessage({ role: 'pedro', content: JSON.stringify(pedroData), timestamp: Date.now() }, currentHistory);
      return { success: true, data: { ...session, chat_history: currentHistory } };
    }

    // Process Form Submission or general input
    if (session.current_state === 'WAITING_FOR_INFO') {
      await updateState({ company_info: userMessage, current_state: 'START_RESEARCH' });
    }

    // Step 2: Agent Logic (Pedro Analysis)
    const pedroAnalysis = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
      contents: `Analiza: ${userMessage}. Genera un ImpactChart mostrando la mejora potencial en eficiencia o ahorro.`,
    });
    const pedroData = cleanAndParseJSON(pedroAnalysis.text || '');
    researchResults.push(pedroData.message);
    currentHistory = await appendMessage({ role: 'pedro', content: JSON.stringify(pedroData), timestamp: Date.now() }, currentHistory);

    // Step 3: Juan Strategic Wrap-up
    await updateState({ current_state: 'START_REPORT' });
    const juanResponse = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      config: { systemInstruction: JUAN_SYSTEM_PROMPT },
      contents: `Hallazgos: ${JSON.stringify(researchResults)}. Presenta el Roadmap con StepProcess y la solución final con ProposalCard.`,
    });
    const juanData = cleanAndParseJSON(juanResponse.text || '');
    currentHistory = await appendMessage({ role: 'juan', content: JSON.stringify(juanData), timestamp: Date.now() }, currentHistory);

    await updateState({ current_state: 'FINISHED', report_final: juanData.message });

    const { data: finalSession } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    return { success: true, data: finalSession as unknown as SessionData };

  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
