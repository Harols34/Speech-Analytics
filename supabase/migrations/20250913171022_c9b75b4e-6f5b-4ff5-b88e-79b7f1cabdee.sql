-- Crear tablas para el sistema de formación

-- Tabla para escenarios de entrenamiento
CREATE TABLE public.training_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  duration_minutes INTEGER NOT NULL DEFAULT 15,
  client_personality JSONB NOT NULL DEFAULT '{}',
  objectives TEXT[] DEFAULT '{}',
  context TEXT,
  voice_id TEXT,
  voice_name TEXT,
  knowledge_documents TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_active BOOLEAN NOT NULL DEFAULT true,
  account_id UUID,
  created_by UUID
);

-- Tabla para documentos de conocimiento
CREATE TABLE public.knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pdf', 'doc', 'txt', 'manual', 'policy')),
  file_url TEXT NOT NULL,
  description TEXT,
  content_summary TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  file_size INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing', 'ready', 'error')),
  account_id UUID,
  uploaded_by UUID
);

-- Tabla para sesiones de entrenamiento
CREATE TABLE public.training_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.training_scenarios(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('voice', 'chat')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  conversation JSONB NOT NULL DEFAULT '[]',
  ai_summary TEXT,
  performance_score INTEGER CHECK (performance_score >= 0 AND performance_score <= 100),
  insights TEXT[],
  recommendations TEXT[],
  account_id UUID
);

-- Tabla para mensajes de entrenamiento
CREATE TABLE public.training_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.training_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'ai', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  audio_url TEXT,
  duration INTEGER
);

-- Habilitar RLS en todas las tablas
ALTER TABLE public.training_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_messages ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para training_scenarios
CREATE POLICY "Users can view scenarios from assigned accounts" ON public.training_scenarios
  FOR SELECT USING (
    (account_id IN (SELECT get_user_accounts())) OR 
    is_super_admin() OR 
    account_id IS NULL
  );

CREATE POLICY "Users can manage scenarios from assigned accounts" ON public.training_scenarios
  FOR ALL USING (
    (account_id IN (SELECT get_user_accounts())) OR 
    is_super_admin()
  );

-- Políticas RLS para knowledge_documents
CREATE POLICY "Users can view documents from assigned accounts" ON public.knowledge_documents
  FOR SELECT USING (
    (account_id IN (SELECT get_user_accounts())) OR 
    is_super_admin()
  );

CREATE POLICY "Users can manage documents from assigned accounts" ON public.knowledge_documents
  FOR ALL USING (
    (account_id IN (SELECT get_user_accounts())) OR 
    is_super_admin()
  );

-- Políticas RLS para training_sessions
CREATE POLICY "Users can view own sessions or from assigned accounts" ON public.training_sessions
  FOR SELECT USING (
    user_id = auth.uid() OR
    (account_id IN (SELECT get_user_accounts())) OR 
    is_super_admin()
  );

CREATE POLICY "Users can manage own sessions or from assigned accounts" ON public.training_sessions
  FOR ALL USING (
    user_id = auth.uid() OR
    (account_id IN (SELECT get_user_accounts())) OR 
    is_super_admin()
  );

-- Políticas RLS para training_messages
CREATE POLICY "Users can view messages from accessible sessions" ON public.training_messages
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.training_sessions 
      WHERE user_id = auth.uid() OR 
            (account_id IN (SELECT get_user_accounts())) OR 
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superAdmin')
    )
  );

CREATE POLICY "Users can manage messages from accessible sessions" ON public.training_messages
  FOR ALL USING (
    session_id IN (
      SELECT id FROM public.training_sessions 
      WHERE user_id = auth.uid() OR 
            (account_id IN (SELECT get_user_accounts())) OR 
            EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'superAdmin')
    )
  );

-- Triggers para updated_at
CREATE TRIGGER update_training_scenarios_updated_at
  BEFORE UPDATE ON public.training_scenarios
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

CREATE TRIGGER update_training_sessions_updated_at
  BEFORE UPDATE ON public.training_sessions
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();