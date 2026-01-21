import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAccount } from '@/context/AccountContext';

export interface ScenarioAssignment {
  id: string;
  scenario_id: string;
  user_id: string;
  assigned_by: string;
  assigned_at: string;
  completed_at?: string;
  status: 'pending' | 'completed';
  account_id?: string;
  scenario_name?: string;
  user_name?: string;
}

export interface ScenarioStats {
  total_sessions: number;
  avg_score: number;
  avg_duration_minutes: number;
  assigned_count: number;
  completed_assignments: number;
}

export function useScenarioAssignments() {
  const [assignments, setAssignments] = useState<ScenarioAssignment[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedAccountId } = useAccount();

  const fetchAssignments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('scenario_assignments')
        .select(`
          *,
          training_scenarios(name),
          profiles(full_name)
        `)
        .order('assigned_at', { ascending: false });

      if (selectedAccountId && selectedAccountId !== 'all') {
        query = query.eq('account_id', selectedAccountId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mappedAssignments: ScenarioAssignment[] = (data || []).map(item => ({
        id: item.id,
        scenario_id: item.scenario_id,
        user_id: item.user_id,
        assigned_by: item.assigned_by,
        assigned_at: item.assigned_at,
        completed_at: item.completed_at,
        status: item.status as 'pending' | 'completed',
        account_id: item.account_id,
        scenario_name: (item.training_scenarios as any)?.name || 'Escenario eliminado',
        user_name: (item.profiles as any)?.full_name || 'Usuario desconocido'
      }));

      setAssignments(mappedAssignments);
    } catch (error) {
      console.error('Error fetching assignments:', error);
      toast.error('Error al cargar las asignaciones');
    } finally {
      setLoading(false);
    }
  };

  const assignScenarioToUsers = async (scenarioId: string, userIds: string[]) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const assignments = userIds.map(userId => ({
        scenario_id: scenarioId,
        user_id: userId,
        assigned_by: user.user!.id,
        account_id: selectedAccountId === 'all' ? null : selectedAccountId
      }));

      const { error } = await supabase
        .from('scenario_assignments')
        .upsert(assignments, { 
          onConflict: 'scenario_id,user_id'
        });

      if (error) throw error;

      toast.success(`Escenario asignado a ${userIds.length} usuario${userIds.length > 1 ? 's' : ''}`);
      fetchAssignments();
    } catch (error) {
      console.error('Error assigning scenario:', error);
      toast.error('Error al asignar el escenario');
      throw error;
    }
  };

  const markAssignmentCompleted = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('scenario_assignments')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString()
        })
        .eq('id', assignmentId);

      if (error) throw error;

      fetchAssignments();
    } catch (error) {
      console.error('Error marking assignment completed:', error);
      throw error;
    }
  };

  const removeAssignment = async (assignmentId: string) => {
    try {
      const { error } = await supabase
        .from('scenario_assignments')
        .delete()
        .eq('id', assignmentId);

      if (error) throw error;
      toast.success('Asignación eliminada');
      fetchAssignments();
    } catch (error) {
      console.error('Error removing assignment:', error);
      toast.error('No se pudo eliminar la asignación');
      throw error;
    }
  };

  const getScenarioStats = async (scenarioId: string): Promise<ScenarioStats> => {
    try {
      const { data, error } = await supabase
        .rpc('get_scenario_stats', { scenario_uuid: scenarioId });

      if (error) throw error;

      return {
        total_sessions: Number(data[0]?.total_sessions || 0),
        avg_score: Number(data[0]?.avg_score || 0),
        avg_duration_minutes: Number(data[0]?.avg_duration_minutes || 0),
        assigned_count: Number(data[0]?.assigned_count || 0),
        completed_assignments: Number(data[0]?.completed_assignments || 0)
      };
    } catch (error) {
      console.error('Error getting scenario stats:', error);
      return {
        total_sessions: 0,
        avg_score: 0,
        avg_duration_minutes: 0,
        assigned_count: 0,
        completed_assignments: 0
      };
    }
  };

  useEffect(() => {
    fetchAssignments();
  }, [selectedAccountId]);

  return {
    assignments,
    loading,
    fetchAssignments,
    assignScenarioToUsers,
    markAssignmentCompleted,
    removeAssignment,
    getScenarioStats
  };
}
