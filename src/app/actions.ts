
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
Usa ComparativeTable, InteractiveROICalculator, SWOTAnalysis, GanttMiniTimeline o ProposalCard.
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

    currentHistory = [...currentHistory, { role: 'user', content: userMessage, timestamp: Date.now() }];
    await updateDB({ chat_history: currentHistory });

    if (currentHistory.length === 1) {
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
      await updateDB({ chat_history: currentHistory });
    } 
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
    else if (session.current_state === 'START_RESEARCH' || session.current_state === 'FINISHED') {
      
      const pedroAnalysis = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: PEDRO_SYSTEM_PROMPT },
        contents: `Información del usuario: ${userMessage}. Contexto previo: ${JSON.stringify(researchResults)}. 
        Realiza un análisis profundo y elige el componente más adecuado (ImpactChart, RiskAssessment, TechStackGrid o PriorityMatrix).`,
      });
      const pData = cleanAndParseJSON(pedroAnalysis.text || '');
      researchResults.push(pData.message);
      currentHistory.push({ role: 'pedro', content: JSON.stringify(pData), timestamp: Date.now() });
      
      const juanReport = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        config: { systemInstruction: JUAN_SYSTEM_PROMPT },
        contents: `Hallazgos de Pedro: ${JSON.stringify(researchResults)}. 
        Tarea: Crea la estrategia de negocio. Usa ComparativeTable, InteractiveROICalculator, SWOTAnalysis, GanttMiniTimeline o ProposalCard. 
        Al final, invita al contacto a ProDig al 3144897092.`,
      });
      const jData = cleanAndParseJSON(juanReport.text || '');
      
      if (!jData.message.includes('3144897092')) {
        jData.message += "\n\n---\n¿Dudas? Contacta a **ProDig** al **3144897092**.";
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
