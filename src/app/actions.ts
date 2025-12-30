
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
- BusinessForm: "title", "fields" (array strings). Incluir "problema_ia".
- ImpactChart: "title", "labels", "values" (números), "unit".
- ProposalCard: "title", "roi", "cost", "features".
- StepProcess: "steps", "currentStep".
`;

const PEDRO_SYSTEM_PROMPT = `
Eres Pedro, Consultor de IA Senior. Tu color es el ESMERALDA/VERDE. Eres técnico, preciso y analítico.
Tu objetivo es identificar oportunidades de automatización y eficiencia técnica.
${PROTOCOL_INSTRUCTION}
`;

const JUAN_SYSTEM_PROMPT = `
Eres Juan, Ingeniero y Estratega de Negocios. Tu color es el CIELO/AZUL. Eres ejecutivo, empático y enfocado en el ROI.
Tu objetivo es transformar la técnica en valor de negocio y guiar la implementación.
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

export async function createSession(userId: string): Promise<ActionResponse<SessionData>> {
  try {
    const supabase = createServerSupabaseAdmin();
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

    // ESTADO 1: BIENVENIDA DUAL
    if (currentHistory.length === 1) {
      // Juan se presenta (Mensaje 1)
      const juanIntro = {
        message: "¡Hola! Soy **Juan**, Ingeniero y Estratega de Negocios. Mi misión es asegurar que cada tecnología se convierta en un motor de crecimiento real para tu empresa.",
        componentName: null,
        data: {}
      };
      // Pedro se presenta (Mensaje 2)
      const pedroIntro = {
        message: "Y yo soy **Pedro**, Consultor de IA. Juntos vamos a ayudarte a decidir en qué parte de tu empresa o proyecto puedes implementar IA y automatizaciones.\n\nPara empezar, solo tenemos unas preguntas iniciales para conocerte mejor. ¿Estás listo? Escribe **'si'** o **'listo'**.",
        componentName: null,
        data: {}
      };

      currentHistory.push({ role: 'juan', content: JSON.stringify(juanIntro), timestamp: Date.now() });
      currentHistory.push({ role: 'pedro', content: JSON.stringify(pedroIntro), timestamp: Date.now() });
      await updateDB({ chat_history: currentHistory });
    } 
    // ESTADO 2: ENVÍO DE FORMULARIO TRAS CONFIRMACIÓN
    else if (session.current_state === 'WAITING_FOR_INFO' && 
             (userMessage.toLowerCase().includes('si') || userMessage.toLowerCase().includes('listo'))) {
      
      const formResponse = {
        message: "Excelente. Por favor, completa este breve diagnóstico para que podamos analizar tu caso con precisión técnica.",
        componentName: 'BusinessForm',
        data: {
          title: "Diagnóstico de Potencial IA",
          fields: ["nombre_empresa", "sector_industria", "numero_empleados", "problema_ia_a_resolver"]
        }
      };
      
      currentHistory.push({ role: 'pedro', content: JSON.stringify(formResponse), timestamp: Date.now() });
      await updateDB({ chat_history: currentHistory, current_state: 'START_RESEARCH' });
    }
    // ESTADO 3: PROCESAMIENTO Y CIERRE
    else if (session.current_state === 'START_RESEARCH' || session.current_state === 'FINISHED') {
      
      // Pedro analiza técnicamente
      const pedroAnalysis = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
        contents: `Analiza esta información y genera una gráfica de impacto: ${userMessage}.`,
      });
      const pData = cleanAndParseJSON(pedroAnalysis.text || '');
      researchResults.push(pData.message);
      currentHistory.push({ role: 'pedro', content: JSON.stringify(pData), timestamp: Date.now() });
      
      // Juan cierra con estrategia y contacto
      const juanReport = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: JUAN_SYSTEM_PROMPT },
        contents: `Hallazgos de Pedro: ${JSON.stringify(researchResults)}. Presenta el roadmap (StepProcess) y la propuesta final (ProposalCard). 
        IMPORTANTE: Al final de tu mensaje, invita al usuario a contactar a ProDig al 3144897092 si tiene dudas adicionales.`,
      });
      const jData = cleanAndParseJSON(juanReport.text || '');
      
      // Asegurar que el mensaje de Juan tenga la invitación de contacto si la IA lo omite
      if (!jData.message.includes('3144897092')) {
        jData.message += "\n\n---\n¿Tienes alguna duda adicional? Estaré encantado de resolverla. También puedes contactarnos directamente en **ProDig** al **3144897092** para una sesión personalizada.";
      }

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
