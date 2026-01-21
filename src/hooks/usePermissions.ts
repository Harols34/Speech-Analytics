import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';

export interface SystemModule {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  parent_module_id: string | null;
  route: string | null;
  icon: string | null;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface ModuleAction {
  id: string;
  module_id: string;
  name: string;
  display_name: string;
  description: string | null;
  action_key: string;
  created_at: string;
}

export interface RolePermission {
  id: string;
  role: string;
  module_id: string;
  can_access: boolean;
  allowed_actions: string[];
  created_at: string;
  updated_at: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  module_id: string;
  can_access: boolean;
  allowed_actions: string[];
  created_at: string;
  updated_at: string;
}

export function useSystemModules() {
  return useQuery({
    queryKey: ['system-modules'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_modules')
        .select('*')
        .order('order_index');
      
      if (error) throw error;
      return data as SystemModule[];
    }
  });
}

export function useModuleActions(moduleId?: string) {
  return useQuery({
    queryKey: ['module-actions', moduleId],
    queryFn: async () => {
      let query = supabase
        .from('module_actions')
        .select('*');
      
      if (moduleId) {
        query = query.eq('module_id', moduleId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as ModuleAction[];
    },
    enabled: !!moduleId
  });
}

export function useRolePermissions(role?: string) {
  return useQuery({
    queryKey: ['role-permissions', role],
    queryFn: async () => {
      let query = supabase
        .from('role_permissions')
        .select('*');
      
      if (role) {
        query = query.eq('role', role);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data as RolePermission[];
    }
  });
}

export function useUserPermissions(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['user-permissions', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [];
      
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', targetUserId);
      
      if (error) throw error;
      return data as UserPermission[];
    },
    enabled: !!targetUserId
  });
}

export function useCheckPermission(moduleName: string, actionKey?: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['check-permission', user?.id, moduleName, actionKey],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc('check_user_permission', {
        p_user_id: user.id,
        p_module_name: moduleName,
        p_action_key: actionKey || null
      });
      
      if (error) {
        console.error('Error checking permission:', error);
        return false;
      }
      
      return data as boolean;
    },
    enabled: !!user?.id,
    staleTime: 15000,
    gcTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
}

export function useEffectivePermissions(userId?: string) {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  return useQuery({
    queryKey: ['effective-permissions', targetUserId],
    queryFn: async () => {
      if (!targetUserId) return [] as Array<{ module_id: string; module_name: string; can_access: boolean; allowed_actions: string[] }>;

      const { data, error } = await supabase.rpc('get_effective_permissions_for_user', {
        p_user_id: targetUserId
      });

      if (error) throw error;
      return (data || []) as Array<{ module_id: string; module_name: string; can_access: boolean; allowed_actions: string[] }>;
    },
    enabled: !!targetUserId,
    staleTime: 15000,
    gcTime: 60000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  });
}