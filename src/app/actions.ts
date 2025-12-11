'use server';

import { GoogleGenAI } from '@google/genai';
import { createServerSupabaseAdmin } from '@/lib/supabase/supabase-client';
import { ChatMessage, Database, SessionData } from '@/lib/types';

// Initialize Gemini safely
// We verify both standard API_KEY and user specific GEMINI_API_KEY
const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API_KEY is not set in environment variables");
  return new GoogleGenAI({ apiKey });
};

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
  const { data: rawSession, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (error || !rawSession) {
    throw new Error('Session not found');
  }

  // Cast DB Row to App Type manually to ensure TS is happy
  const session: SessionData = {
    id: rawSession.id,
    user_id: rawSession.user_id,
    chat_history: rawSession.chat_history as unknown as ChatMessage[],
    company_info: rawSession.company_info,
    research_results: (rawSession.research_results as unknown as string[]) || [],
    report_final: rawSession.report_final,
    current_state: rawSession.current_state as any,
    research_counter: rawSession.research_counter
  };

  // Helper to update DB state
  // FIX: Explicitly type 'updates' to match the Database Update definition minus ID
  const updateState = async (updates: Database['public']['Tables']['sessions']['Update']) => {
    // We explicitly exclude 'id' from the update payload if it somehow got in, though the type helps.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...cleanUpdates } = updates as any; 
    await supabase.from('sessions').update(cleanUpdates).eq('id', sessionId);
  };

  // Helper to append message
  const appendMessage = async (msg: ChatMessage, currentHistory: ChatMessage[]) => {
    const newHistory = [...currentHistory, msg];
    // Cast to unknown then any/Json for Supabase
    await updateState({ chat_history: newHistory as unknown as any });
    return newHistory;
  };

  let currentHistory = session.chat_history || [];
  let researchResults = session.research_results || [];
  let researchCounter = session.research_counter || 0;

  // --- Step 1: User Input Processing ---
  currentHistory = await appendMessage(
    { role: 'user', content: userMessage, timestamp: Date.now() },
    currentHistory
  );

  if (session.current_state === 'WAITING_FOR_INFO') {
    await updateState({ 
      company_info: userMessage, 
      current_state: 'START_RESEARCH' 
    });
  }

  // --- Step 2: Agent Logic ---
  
  try {
    // === AGENT: PEDRO ===
    const pedroResponse1 = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
      contents: `Analiza esta información de la empresa: "${session.company_info || userMessage}". Identifica 3 vectores de ataque o mejora técnica.`,
    });
    
    const pedroText1 = pedroResponse1.text || 'Sin respuesta técnica.';
    researchResults.push(pedroText1);
    
    currentHistory = await appendMessage(
      { role: 'pedro', content: pedroText1, timestamp: Date.now() },
      currentHistory
    );

    researchCounter++;
    
    // Update both results and counter
    await updateState({ 
      research_results: researchResults as unknown as any,
      research_counter: researchCounter,
      current_state: 'DECIDE_FLOW'
    });

    // === DECISION NODE ===
    if (researchCounter < 2) {
       const pedroResponse2 = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
        contents: `Basado en tu análisis anterior: "${pedroText1}", profundiza en la infraestructura de datos necesaria. Sé muy específico técnicamente.`,
      });
      
      const pedroText2 = pedroResponse2.text || 'Sin detalle técnico adicional.';
      researchResults.push(pedroText2);

      currentHistory = await appendMessage(
        { role: 'pedro', content: pedroText2, timestamp: Date.now() },
        currentHistory
      );
      
      researchCounter++;
      await updateState({ 
        research_results: researchResults as unknown as any,
        research_counter: researchCounter 
      });
    }

    // === AGENT: JUAN ===
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

    const juanText = juanResponse.text || 'Error generando reporte final.';

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