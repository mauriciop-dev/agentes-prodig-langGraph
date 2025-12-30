
export type AgentRole = 'user' | 'pedro' | 'juan' | 'system';

export interface ChatMessage {
  role: AgentRole;
  content: string; // Contiene JSON para A2UI
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
export type A2UIComponentName = 
  | 'BusinessForm' 
  | 'ImpactChart' 
  | 'ProposalCard' 
  | 'StepProcess'
  | 'ComparativeTable'
  | 'PriorityMatrix'
  | 'InteractiveROICalculator'
  | 'TechStackGrid'
  | 'SWOTAnalysis'
  | 'GanttMiniTimeline'
  | 'TestimonialCard'
  | 'RiskAssessment';

export interface A2UIResponse {
  message: string;
  componentName?: A2UIComponentName;
  data?: any;
}

// Data Interfaces for new components
export interface ComparativeTableData {
  title: string;
  rows: { label: string; before: string; after: string }[];
}

export interface PriorityMatrixData {
  title: string;
  items: { name: string; impact: number; difficulty: number }[]; // 0 to 100
}

export interface ROICalculatorData {
  title: string;
  hourlyRate: number;
  hoursLost: number;
  efficiencyGain: number; // percentage
}

export interface TechStackData {
  title: string;
  stack: { name: string; category: string }[];
}

export interface SWOTData {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface GanttData {
  title: string;
  phases: { name: string; start: number; duration: number }[];
}

export interface TestimonialData {
  client: string;
  quote: string;
  result: string;
}

export interface RiskData {
  risks: { name: string; level: 'low' | 'medium' | 'high'; description: string }[];
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
