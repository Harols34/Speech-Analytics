-- Tabla para roles personalizados
CREATE TABLE IF NOT EXISTS public.custom_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.custom_roles ENABLE ROW LEVEL SECURITY;

-- Solo SuperAdmin puede gestionar roles personalizados
CREATE POLICY "SuperAdmin can manage custom roles"
ON public.custom_roles
FOR ALL
USING (is_super_admin())
WITH CHECK (is_super_admin());

-- Todos pueden ver roles para selección
CREATE POLICY "Everyone can view custom roles"
ON public.custom_roles
FOR SELECT
USING (true);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_custom_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER custom_roles_updated_at
BEFORE UPDATE ON public.custom_roles
FOR EACH ROW
EXECUTE FUNCTION update_custom_roles_updated_at();

-- Insertar roles por defecto si no existen
INSERT INTO public.custom_roles (name, display_name, description) VALUES
  ('calidad', 'Calidad', 'Analista de calidad con acceso a análisis y llamadas'),
  ('supervisor_calidad', 'Supervisor de Calidad', 'Supervisor del equipo de calidad'),
  ('supervisor_operaciones', 'Supervisor de Operaciones', 'Supervisor del equipo de operaciones')
ON CONFLICT (name) DO NOTHING;