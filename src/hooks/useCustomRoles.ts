import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Role {
  value: string;
  label: string;
  isSystem?: boolean;
  isCustom?: boolean;
}

const SYSTEM_ROLES: Role[] = [
  { value: 'superAdmin', label: 'Super Administrador', isSystem: true },
  { value: 'admin', label: 'Administrador', isSystem: true },
  { value: 'supervisor', label: 'Supervisor', isSystem: true },
  { value: 'qualityAnalyst', label: 'Analista de Calidad', isSystem: true },
  { value: 'backOffice', label: 'Back Office', isSystem: true },
  { value: 'agent', label: 'Agente', isSystem: true }
];

export function useCustomRoles() {
  const { data: customRoles = [], isLoading } = useQuery({
    queryKey: ['custom-roles'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custom_roles')
        .select('*')
        .order('display_name');
      
      if (error) throw error;
      
      return (data || []).map(role => ({
        value: role.name,
        label: role.display_name,
        isCustom: true
      }));
    }
  });

  const allRoles = [...SYSTEM_ROLES, ...customRoles];

  return {
    systemRoles: SYSTEM_ROLES,
    customRoles,
    allRoles,
    isLoading
  };
}
