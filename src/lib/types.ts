export type AgentRole = 'user' | 'pedro' | 'juan' | 'system';

export interface ChatMessage {
  role: AgentRole;
  content: string;
  timestamp: number;
}

export type WorkflowState = 
  | 'WAITING_FOR_INFO' 
  | 'START_RESEARCH' 
  | 'DECIDE_FLOW' 
  | 'START_REPORT' 
  | 'FINISHED';

// Tipo de la aplicación (Frontend)
export interface SessionData {
  id: string;
  user_id: string;
  chat_history: ChatMessage[];
  company_info: string | null;
  research_results: string[]; 
  report_final: string | null;
  current_state: WorkflowState;
  research_counter: number;
  created_at?: string;
}

// Supabase Helper Types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Definición de la Base de Datos para Supabase
export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          user_id: string
          chat_history: Json // En DB es JSONB
          company_info: string | null
          research_results: Json // En DB es JSONB
          report_final: string | null
          current_state: string // En DB es text
          research_counter: number
          created_at?: string
        }
        Insert: {
          id?: string
          user_id: string
          chat_history?: Json
          company_info?: string | null
          research_results?: Json
          report_final?: string | null
          current_state?: string
          research_counter?: number
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          chat_history?: Json
          company_info?: string | null
          research_results?: Json
          report_final?: string | null
          current_state?: string
          research_counter?: number
          created_at?: string
        }
      }
    }
  }
}