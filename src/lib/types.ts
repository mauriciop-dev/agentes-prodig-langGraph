
export type AgentRole = 'user' | 'pedro' | 'juan' | 'system';

export interface ChatMessage {
  role: AgentRole;
  content: string; // This will now contain JSON for A2UI
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
  research_results: string[]; 
  report_final: string | null;
  current_state: WorkflowState;
  research_counter: number;
  created_at?: string;
}

export interface ActionResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// A2UI Protocol Types
export interface A2UIResponse {
  message: string;
  componentName?: 'BusinessForm' | 'ImpactChart' | 'ProposalCard' | 'StepProcess';
  data?: any;
}

// Component Data Interfaces
export interface BusinessFormData {
  title: string;
  fields: string[];
}

export interface ImpactChartData {
  title: string;
  labels: string[];
  values: number[];
  unit: string;
}

export interface ProposalCardData {
  title: string;
  roi: string;
  cost: string;
  features: string[];
}

export interface StepProcessData {
  steps: string[];
  currentStep: number;
}

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string
          user_id: string
          chat_history: Json
          company_info: string | null
          research_results: Json
          report_final: string | null
          current_state: string
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
