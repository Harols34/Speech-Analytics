
-- Crear políticas RLS para la tabla profiles para permitir que los usuarios actualicen su propia información
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Asegurar que la función handle_new_user tenga los permisos correctos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, role, language)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'agent',
    'es'
  );
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Si falla la inserción, continuar con el registro del usuario
    RETURN NEW;
END;
$$;
