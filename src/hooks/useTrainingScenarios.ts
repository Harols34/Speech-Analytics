import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { TrainingScenario } from '@/lib/types/training';
import { toast } from 'sonner';
import { useAccount } from '@/context/AccountContext';

export function useTrainingScenarios() {
  const [scenarios, setScenarios] = useState<TrainingScenario[]>([]);
  const [loading, setLoading] = useState(false);
  const { selectedAccountId } = useAccount();

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('training_scenarios')
        .select('*');
      
      // Filter by account if user is not superAdmin
      if (selectedAccountId) {
        query = query.eq('account_id', selectedAccountId);
      }
      
      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      
      // Convertir los datos de Supabase al tipo TrainingScenario
      const typedScenarios: TrainingScenario[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
        category: item.category,
        difficulty: item.difficulty as 'beginner' | 'intermediate' | 'advanced',
        duration_minutes: item.duration_minutes,
        client_personality: typeof item.client_personality === 'string' ? 
          JSON.parse(item.client_personality) : item.client_personality,
        objectives: item.objectives || [],
        context: item.context,
        voice_id: item.voice_id,
        voice_name: item.voice_name,
        knowledge_documents: item.knowledge_documents || [],
        created_at: item.created_at,
        updated_at: item.updated_at,
        is_active: item.is_active,
        account_id: item.account_id,
        created_by: item.created_by,
        // Ensure dynamic fields are persisted when navigating modules
        evaluation_criteria: (item.evaluation_criteria || []) as any,
        knowledge_base: item.knowledge_base || null,
        custom_evaluation_instructions: item.custom_evaluation_instructions || null,
        expected_outcome: item.expected_outcome || null,
        call_completion_rules: (item.call_completion_rules || null) as any
      }));
      
      setScenarios(typedScenarios);
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      toast.error('Error al cargar los escenarios');
    } finally {
      setLoading(false);
    }
  };

  const createScenario = async (scenario: Omit<TrainingScenario, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      // Convertir TrainingScenario al formato de la base de datos
      const dbScenario = {
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        difficulty: scenario.difficulty,
        duration_minutes: scenario.duration_minutes,
        client_personality: scenario.client_personality as any,
        objectives: scenario.objectives,
        context: scenario.context,
        voice_id: scenario.voice_id,
        voice_name: scenario.voice_name,
        knowledge_documents: scenario.knowledge_documents,
        is_active: scenario.is_active,
        account_id: scenario.account_id,
        created_by: scenario.created_by,
        // Nuevos campos dinámicos - conversión explícita a JSON
        evaluation_criteria: (scenario.evaluation_criteria || []) as any,
        knowledge_base: scenario.knowledge_base || null,
        custom_evaluation_instructions: scenario.custom_evaluation_instructions || null,
        expected_outcome: scenario.expected_outcome || null,
        call_completion_rules: (scenario.call_completion_rules || {
          success_message: '¡Excelente trabajo! Has completado el escenario exitosamente.',
          failure_message: 'Disculpa, no tengo más tiempo. Gracias.',
          auto_close_on_failure: true
        }) as any
      };

      const { data, error } = await supabase
        .from('training_scenarios')
        .insert([dbScenario])
        .select()
        .single();

      if (error) throw error;
      
      // Convertir la respuesta al tipo TrainingScenario
      const typedScenario: TrainingScenario = {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty as 'beginner' | 'intermediate' | 'advanced',
        duration_minutes: data.duration_minutes,
        client_personality: typeof data.client_personality === 'string' ? 
          JSON.parse(data.client_personality) : data.client_personality,
        objectives: data.objectives || [],
        context: data.context,
        voice_id: data.voice_id,
        voice_name: data.voice_name,
        knowledge_documents: data.knowledge_documents || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_active: data.is_active,
        account_id: data.account_id,
        created_by: data.created_by,
        evaluation_criteria: (data.evaluation_criteria || []) as any,
        knowledge_base: data.knowledge_base,
        custom_evaluation_instructions: data.custom_evaluation_instructions,
        expected_outcome: data.expected_outcome,
        call_completion_rules: (data.call_completion_rules || {
          success_message: '¡Excelente trabajo! Has completado el escenario exitosamente.',
          failure_message: 'Disculpa, no tengo más tiempo. Gracias.',
          auto_close_on_failure: true
        }) as any
      };
      
      setScenarios(prev => [typedScenario, ...prev]);
      toast.success('Escenario creado exitosamente');
      return typedScenario;
    } catch (error) {
      console.error('Error creating scenario:', error);
      toast.error('Error al crear el escenario');
      throw error;
    }
  };

  const updateScenario = async (id: string, updates: Partial<TrainingScenario>) => {
    try {
      // Convertir updates al formato de la base de datos
      const dbUpdates = {
        ...(updates.name && { name: updates.name }),
        ...(updates.description && { description: updates.description }),
        ...(updates.category && { category: updates.category }),
        ...(updates.difficulty && { difficulty: updates.difficulty }),
        ...(updates.duration_minutes && { duration_minutes: updates.duration_minutes }),
        ...(updates.client_personality && { client_personality: updates.client_personality as any }),
        ...(updates.objectives && { objectives: updates.objectives }),
        ...(updates.context && { context: updates.context }),
        ...(updates.voice_id !== undefined && { voice_id: updates.voice_id }),
        ...(updates.voice_name !== undefined && { voice_name: updates.voice_name }),
        ...(updates.knowledge_documents && { knowledge_documents: updates.knowledge_documents }),
        ...(updates.is_active !== undefined && { is_active: updates.is_active }),
        ...(updates.account_id && { account_id: updates.account_id }),
        // Nuevos campos dinámicos - conversión explícita a JSON
        ...(updates.evaluation_criteria !== undefined && { evaluation_criteria: updates.evaluation_criteria as any }),
        ...(updates.knowledge_base !== undefined && { knowledge_base: updates.knowledge_base }),
        ...(updates.custom_evaluation_instructions !== undefined && { custom_evaluation_instructions: updates.custom_evaluation_instructions }),
        ...(updates.expected_outcome !== undefined && { expected_outcome: updates.expected_outcome }),
        ...(updates.call_completion_rules !== undefined && { call_completion_rules: updates.call_completion_rules as any })
      };

      const { data, error } = await supabase
        .from('training_scenarios')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Convertir la respuesta al tipo TrainingScenario
      const typedScenario: TrainingScenario = {
        id: data.id,
        name: data.name,
        description: data.description,
        category: data.category,
        difficulty: data.difficulty as 'beginner' | 'intermediate' | 'advanced',
        duration_minutes: data.duration_minutes,
        client_personality: typeof data.client_personality === 'string' ? 
          JSON.parse(data.client_personality) : data.client_personality,
        objectives: data.objectives || [],
        context: data.context,
        voice_id: data.voice_id,
        voice_name: data.voice_name,
        knowledge_documents: data.knowledge_documents || [],
        created_at: data.created_at,
        updated_at: data.updated_at,
        is_active: data.is_active,
        account_id: data.account_id,
        created_by: data.created_by,
        evaluation_criteria: (data.evaluation_criteria || []) as any,
        knowledge_base: data.knowledge_base,
        custom_evaluation_instructions: data.custom_evaluation_instructions,
        expected_outcome: data.expected_outcome,
        call_completion_rules: (data.call_completion_rules || {
          success_message: '¡Excelente trabajo! Has completado el escenario exitosamente.',
          failure_message: 'Disculpa, no tengo más tiempo. Gracias.',
          auto_close_on_failure: true
        }) as any
      };

      setScenarios(prev => prev.map(s => 
        s.id === id ? typedScenario : s
      ));
      toast.success('Escenario actualizado exitosamente');
    } catch (error) {
      console.error('Error updating scenario:', error);
      toast.error('Error al actualizar el escenario');
      throw error;
    }
  };

  const deleteScenario = async (id: string) => {
    try {
      const { error } = await supabase
        .from('training_scenarios')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setScenarios(prev => prev.filter(s => s.id !== id));
      toast.success('Escenario eliminado exitosamente');
    } catch (error) {
      console.error('Error deleting scenario:', error);
      toast.error('Error al eliminar el escenario');
      throw error;
    }
  };

  useEffect(() => {
    // Wait for account selection to avoid loading all scenarios on first render
    if (selectedAccountId === undefined || selectedAccountId === null) return;
    fetchScenarios();
  }, [selectedAccountId]);

  return {
    scenarios,
    loading,
    createScenario,
    updateScenario,
    deleteScenario,
    refetch: fetchScenarios
  };
}