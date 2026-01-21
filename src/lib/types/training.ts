export interface EvaluationCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // Peso en porcentaje (0-100)
}

export interface CallCompletionRules {
  success_message: string;
  failure_message: string;
  auto_close_on_failure: boolean;
}

export interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  category: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration_minutes: number;
  client_personality: ClientPersonality;
  objectives: string[];
  context: string;
  voice_id?: string;
  voice_name?: string;
  knowledge_documents: string[];
  created_at: string;
  updated_at: string;
  is_active: boolean;
  account_id?: string;
  created_by?: string;
  // Nuevos campos para calificación dinámica
  evaluation_criteria?: EvaluationCriterion[];
  knowledge_base?: string;
  custom_evaluation_instructions?: string;
  expected_outcome?: string;
  call_completion_rules?: CallCompletionRules;
}

export interface ClientPersonality {
  type: 'neutral' | 'suspicious' | 'hurried' | 'curious' | 'skeptical' | 'friendly' | 'aggressive';
  description: string;
  traits: string[];
  [key: string]: any;
}

export interface ElevenLabsVoice {
  voice_id: string;
  name: string;
  category: string;
  description?: string;
  preview_url?: string;
  settings?: VoiceSettings;
  gender?: string;
  age?: string;
  accent?: string;
  language?: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

export interface KnowledgeDocument {
  id: string;
  name: string;
  type: 'pdf' | 'doc' | 'txt' | 'manual' | 'policy';
  file_url: string;
  description?: string;
  content_summary?: string;
  uploaded_at: string;
  file_size: number;
  status: 'processing' | 'ready' | 'error';
  account_id?: string;
  uploaded_by?: string;
}

export interface TrainingSession {
  id: string;
  scenario_id: string;
  scenario_name: string;
  user_id: string;
  user_name: string; // Agent's display name for proper identification
  type: 'voice' | 'chat';
  status: 'active' | 'completed' | 'cancelled';
  started_at: string;
  completed_at?: string;
  duration_seconds?: number;
  recording_url?: string | null; // URL de la grabación completa de la sesión
  conversation: TrainingMessage[];
  ai_summary?: string;
  performance_score?: number;
  insights?: string[];
  recommendations?: string[];
  account_id?: string;
  ai_report?: any; // Full analysis report from TrainingFeedback
  mensajes_generales?: number;
  mensajes_ia?: number;
  mensajes_usuario?: number;
}

export interface TrainingMessage {
  id: string;
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: string;
  audio_url?: string;
  duration?: number;
  [key: string]: any;
}

export interface TrainingMetrics {
  communication_skills: number;
  problem_solving: number;
  empathy: number;
  product_knowledge: number;
  call_resolution: number;
  overall_score: number;
}