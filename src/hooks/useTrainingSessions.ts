import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingSession } from '@/lib/types/training';
import { toast } from 'sonner';

export function useTrainingSessions() {
  const [sessions, setSessions] = useState<TrainingSession[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('training_sessions')
        .select(`
          *,
          training_scenarios(name)
        `)
        .order('started_at', { ascending: false });

      if (error) throw error;
      
      const formattedSessions: TrainingSession[] = (data || []).map(session => ({
        id: session.id,
        scenario_id: session.scenario_id,
        scenario_name: session.training_scenarios?.name || 'Escenario eliminado',
        user_id: session.user_id,
        user_name: session.user_name || 'Usuario', // Use stored user name
        type: session.type as 'voice' | 'chat',
        status: session.status as 'active' | 'completed' | 'cancelled',
        started_at: session.started_at,
        completed_at: session.completed_at,
        duration_seconds: session.duration_seconds,
        conversation: (session.conversation as any[])?.map((msg: any) => ({
          id: msg.id || crypto.randomUUID(),
          role: msg.role || 'system',
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          audio_url: msg.audio_url,
          duration: msg.duration
        })) || [],
        ai_summary: session.ai_summary,
        performance_score: session.performance_score,
        insights: session.insights || [],
        recommendations: session.recommendations || [],
        account_id: session.account_id,
        ai_report: session.ai_report || null
      }));

      setSessions(formattedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast.error('Error al cargar las sesiones');
    } finally {
      setLoading(false);
    }
  };

  const createSession = async (session: Omit<TrainingSession, 'id' | 'started_at' | 'user_name' | 'scenario_name'>) => {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('Usuario no autenticado');

      const dbSession = {
        scenario_id: session.scenario_id,
        user_id: user.user.id,
        type: session.type,
        status: session.status,
        duration_seconds: session.duration_seconds,
        conversation: session.conversation as any,
        ai_summary: session.ai_summary,
        performance_score: session.performance_score,
        insights: session.insights,
        recommendations: session.recommendations,
        account_id: session.account_id,
        completed_at: session.completed_at
      };

      const { data, error } = await supabase
        .from('training_sessions')
        .insert([dbSession])
        .select(`
          *,
          training_scenarios(name)
        `)
        .single();

      if (error) throw error;
      
      const formattedSession: TrainingSession = {
        id: data.id,
        scenario_id: data.scenario_id,
        scenario_name: data.training_scenarios?.name || 'Escenario eliminado',
        user_id: data.user_id,
        user_name: '', // Este campo se llenará con datos del usuario autenticado
        type: data.type as 'voice' | 'chat',
        status: data.status as 'active' | 'completed' | 'cancelled',
        started_at: data.started_at,
        completed_at: data.completed_at,
        duration_seconds: data.duration_seconds,
        conversation: (data.conversation as any[])?.map((msg: any) => ({
          id: msg.id || crypto.randomUUID(),
          role: msg.role || 'system',
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          audio_url: msg.audio_url,
          duration: msg.duration
        })) || [],
        ai_summary: data.ai_summary,
        performance_score: data.performance_score,
        insights: data.insights || [],
        recommendations: data.recommendations || [],
        account_id: data.account_id,
        ai_report: data.ai_report || null
      };
      
      setSessions(prev => [formattedSession, ...prev]);
      toast.success('Sesión de entrenamiento iniciada');
      return formattedSession;
    } catch (error) {
      console.error('Error creating session:', error);
      toast.error('Error al crear la sesión');
      throw error;
    }
  };

  const updateSession = async (id: string, updates: Partial<TrainingSession>) => {
    try {
      const dbUpdates = {
        ...(updates.status && { status: updates.status }),
        ...(updates.completed_at && { completed_at: updates.completed_at }),
        ...(updates.duration_seconds !== undefined && { duration_seconds: updates.duration_seconds }),
        ...(updates.conversation && { conversation: updates.conversation as any }),
        ...(updates.ai_summary && { ai_summary: updates.ai_summary }),
        ...(updates.performance_score !== undefined && { performance_score: updates.performance_score }),
        ...(updates.insights && { insights: updates.insights }),
        ...(updates.recommendations && { recommendations: updates.recommendations })
      };

      const { data, error } = await supabase
        .from('training_sessions')
        .update(dbUpdates)
        .eq('id', id)
        .select(`
          *,
          training_scenarios(name)
        `)
        .single();

      if (error) throw error;

      const formattedSession: TrainingSession = {
        id: data.id,
        scenario_id: data.scenario_id,
        scenario_name: data.training_scenarios?.name || 'Escenario eliminado',
        user_id: data.user_id,
        user_name: '', // Este campo se llenará con datos del usuario autenticado
        type: data.type as 'voice' | 'chat',
        status: data.status as 'active' | 'completed' | 'cancelled',
        started_at: data.started_at,
        completed_at: data.completed_at,
        duration_seconds: data.duration_seconds,
        conversation: (data.conversation as any[])?.map((msg: any) => ({
          id: msg.id || crypto.randomUUID(),
          role: msg.role || 'system',
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
          audio_url: msg.audio_url,
          duration: msg.duration
        })) || [],
        ai_summary: data.ai_summary,
        performance_score: data.performance_score,
        insights: data.insights || [],
        recommendations: data.recommendations || [],
        account_id: data.account_id,
        ai_report: data.ai_report || null
      };

      setSessions(prev => prev.map(s => 
        s.id === id ? formattedSession : s
      ));
      toast.success('Sesión actualizada exitosamente');
    } catch (error) {
      console.error('Error updating session:', error);
      toast.error('Error al actualizar la sesión');
      throw error;
    }
  };

  const completeSession = async (
    id: string, 
    summary: string, 
    score: number, 
    insights: string[], 
    recommendations: string[]
  ) => {
    try {
      const updates = {
        status: 'completed' as const,
        completed_at: new Date().toISOString(),
        ai_summary: summary,
        performance_score: score,
        insights,
        recommendations
      };

      await updateSession(id, updates);
    } catch (error) {
      console.error('Error completing session:', error);
      throw error;
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  return {
    sessions,
    loading,
    createSession,
    updateSession,
    completeSession,
    refetch: fetchSessions
  };
}