'use server';

import { GoogleGenAI } from '@google/genai';
import { createServerSupabaseAdmin } from '@/lib/supabase/supabase-client';
import { ChatMessage, SessionData } from '@/lib/types';

// Initialize Gemini
// NOTE: We initialize strictly inside the action or use a getter to ensure Env vars are present in Vercel Runtime
const getAI = () => new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// System Prompts
const PEDRO_SYSTEM_PROMPT = `
Eres Pedro, un Ingeniero de IA Senior y Analista de Datos en 'Consultores Empresariales IA'.
Tu tono es: Analítico, Técnico, Objetivo y Directo.
Tu tarea es analizar la información de la empresa proporcionada e identificar puntos clave, riesgos técnicos y oportunidades de automatización.
Sé conciso. Usa terminología técnica adecuada.
`;

const JUAN_SYSTEM_PROMPT = `
Eres Juan, un Project Manager y Estratega de Negocios en 'Consultores Empresariales IA'.
Tu tono es: Ejecutivo, Estratégico, Empático y No-técnico.
Tu tarea es tomar los hallazgos técnicos de Pedro y sintetizarlos en un plan de acción ejecutivo.
Habla en términos de valor de negocio, ROI y estrategia. Eres amable y profesional.
`;

/**
 * Main Entry Point for User Interaction
 */
export async function runConsultancyFlow(sessionId: string, userMessage: string) {
  const supabase = createServerSupabaseAdmin();
  const ai = getAI();

  // 1. Fetch current session state
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !session) {
    throw new Error('Session not found');
  }

  // Helper to update DB state
  const updateState = async (updates: Partial<SessionData>) => {
    await supabase.from('sessions').update(updates).eq('id', sessionId);
  };

  // Helper to append message
  const appendMessage = async (msg: ChatMessage, currentHistory: ChatMessage[]) => {
    const newHistory = [...currentHistory, msg];
    await updateState({ chat_history: newHistory });
    return newHistory;
  };

  let currentHistory = session.chat_history || [];
  let researchResults = session.research_results || [];
  let researchCounter = session.research_counter || 0;

  // --- Step 1: User Input Processing ---
  // Add User Message
  currentHistory = await appendMessage(
    { role: 'user', content: userMessage, timestamp: Date.now() },
    currentHistory
  );

  // If this is the first interaction, save the company info
  if (session.current_state === 'WAITING_FOR_INFO') {
    await updateState({ 
      company_info: userMessage, 
      current_state: 'START_RESEARCH' 
    });
  }

  // --- Step 2: Agent Logic (Simulated Loop) ---
  // Note: Vercel functions have timeouts. We will execute a bounded sequence.
  
  try {
    // === AGENT: PEDRO (Research Phase) ===
    // We run Pedro immediately after info is received or if we are in the loop
    
    // Notify UI: System is thinking
    // (In a real app, we might push a temporary 'typing' state, but here we just process)

    // Pedro Analysis 1
    const pedroResponse1 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
      contents: `Analiza esta información de la empresa: "${session.company_info || userMessage}". Identifica 3 vectores de ataque o mejora técnica.`,
    });
    
    const pedroText1 = pedroResponse1.text;
    researchResults.push(pedroText1);
    
    currentHistory = await appendMessage(
      { role: 'pedro', content: pedroText1, timestamp: Date.now() },
      currentHistory
    );

    researchCounter++;
    await updateState({ 
      research_results: researchResults,
      research_counter: researchCounter,
      current_state: 'DECIDE_FLOW'
    });

    // === DECISION NODE ===
    // If we haven't dug deep enough (simulated by counter < 2), Pedro goes again.
    if (researchCounter < 2) {
       const pedroResponse2 = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
        contents: `Basado en tu análisis anterior: "${pedroText1}", profundiza en la infraestructura de datos necesaria. Sé muy específico tecnicamente.`,
      });
      
      const pedroText2 = pedroResponse2.text;
      researchResults.push(pedroText2);

      currentHistory = await appendMessage(
        { role: 'pedro', content: pedroText2, timestamp: Date.now() },
        currentHistory
      );
      
      researchCounter++;
      await updateState({ 
        research_results: researchResults,
        research_counter: researchCounter 
      });
    }

    // === AGENT: JUAN (Reporting Phase) ===
    // Once research is done, Juan compiles the report.
    await updateState({ current_state: 'START_REPORT' });

    const juanResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: JUAN_SYSTEM_PROMPT },
      contents: `
        La información de la empresa es: "${session.company_info || userMessage}".
        Los hallazgos técnicos de Pedro fueron: ${JSON.stringify(researchResults)}.
        
        Genera un reporte final estratégico para el cliente. Resume los puntos técnicos en beneficios de negocio y propón los siguientes pasos.
      `,
    });

    const juanText = juanResponse.text;

    currentHistory = await appendMessage(
      { role: 'juan', content: juanText, timestamp: Date.now() },
      currentHistory
    );

    // === FINISH ===
    await updateState({ 
      report_final: juanText,
      current_state: 'FINISHED'
    });

  } catch (error) {
    console.error("Agent Loop Error:", error);
    await appendMessage(
      { role: 'system', content: 'Ocurrió un error procesando tu solicitud. Por favor intenta de nuevo.', timestamp: Date.now() },
      currentHistory
    );
  }
}
