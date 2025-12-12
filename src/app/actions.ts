'use server';

import { GoogleGenAI } from '@google/genai';
import { createServerSupabaseAdmin } from '@/lib/supabase/supabase-client';
import { ChatMessage, Database, SessionData, ActionResponse } from '@/lib/types';

// Initialize Gemini safely
const getAI = () => {
  const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("API_KEY is missing. Check your environment variables.");
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
 * Creates a new session safely on the server using Admin privileges.
 * Catches errors to prevent generic "Server Component" crashes.
 */
export async function createSession(userId: string): Promise<ActionResponse<SessionData>> {
  try {
    // Check Env Var explicitly
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
      return { 
        success: false, 
        error: "Server Configuration Error: SUPABASE_SERVICE_ROLE_KEY is missing." 
      };
    }

    const supabase = createServerSupabaseAdmin();
    
    // FIX: Cast query builder to 'any' to bypass strict TS inference errors on Insert
    const { data: newSession, error: dbError } = await (supabase
      .from('sessions') as any)
      .insert({
        user_id: userId,
        chat_history: [],
        current_state: 'WAITING_FOR_INFO',
        research_counter: 0,
        research_results: [],
      })
      .select()
      .single();

    if (dbError) {
      console.error("DB Error in createSession:", dbError);
      // Handle Foreign Key constraint specifically
      if (dbError.code === '23503') {
        return { 
          success: false, 
          error: "Auth Error: The database requires a registered user. Anonymous sign-ins are disabled and random IDs are not allowed." 
        };
      }
      return { success: false, error: `Database Error: ${dbError.message}` };
    }

    return { success: true, data: newSession as SessionData };

  } catch (error: any) {
    console.error("Unexpected Error in createSession:", error);
    return { success: false, error: error.message || "Unknown server error" };
  }
}

/**
 * Main Entry Point for User Interaction
 */
export async function runConsultancyFlow(sessionId: string, userMessage: string): Promise<ActionResponse<SessionData>> {
  try {
    const supabase = createServerSupabaseAdmin();
    let ai;
    try {
      ai = getAI();
    } catch (e: any) {
       return { success: false, error: e.message };
    }

    // 1. Fetch current session state
    const { data: rawSession, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error || !rawSession) {
      return { success: false, error: 'Session not found in database.' };
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

    // Helper to update DB state
    const updateState = async (updates: Database['public']['Tables']['sessions']['Update']) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id, ...cleanUpdates } = updates as any; 
      const queryBuilder = supabase.from('sessions') as any;
      await queryBuilder.update(cleanUpdates).eq('id', sessionId);
    };

    const appendMessage = async (msg: ChatMessage, currentHistory: ChatMessage[]) => {
      const newHistory = [...currentHistory, msg];
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

    } catch (agentError: any) {
      console.error("Agent Logic Error:", agentError);
      await appendMessage(
        { role: 'system', content: `Error interno de IA: ${agentError.message}`, timestamp: Date.now() },
        currentHistory
      );
    }

    // Final fetch
    const { data: finalSession } = await supabase.from('sessions').select('*').eq('id', sessionId).single();
    
    return { success: true, data: finalSession as unknown as SessionData };

  } catch (err: any) {
    console.error("runConsultancyFlow Critical Error:", err);
    return { success: false, error: err.message };
  }
}
