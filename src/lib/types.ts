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

export interface SessionData {
  id: string;
  user_id: string;
  chat_history: ChatMessage[];
  company_info: string | null;
  research_results: string[]; // JSONB in DB, string[] in app
  report_final: string | null;
  current_state: WorkflowState;
  research_counter: number;
  created_at?: string;
}

// Supabase Database Helper Types
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      sessions: {
        Row: SessionData
        Insert: Omit<SessionData, 'id' | 'created_at'>
        Update: Partial<Omit<SessionData, 'id' | 'created_at'>>
      }
    }
  }
}
