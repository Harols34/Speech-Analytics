import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Upload, Users, BarChart3, Clock, Target, AlertTriangle, CheckSquare } from 'lucide-react';
import { useTrainingScenarios } from '@/hooks/useTrainingScenarios';
import { usePredefinedScenarios } from '@/hooks/usePredefinedScenarios';
import { useScenarioAssignments, ScenarioStats } from '@/hooks/useScenarioAssignments';
import { ScenarioDialog } from './ScenarioDialog';
import { ScenarioAssignmentDialog } from './ScenarioAssignmentDialog';
import { AssignmentsListDialog } from './AssignmentsListDialog';
import { TrainingScenario } from '@/lib/types/training';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useAccount } from '@/context/AccountContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';

export function ScenarioManager() {
  const { scenarios, loading, deleteScenario, createScenario, refetch } = useTrainingScenarios();
  const { predefinedScenarios } = usePredefinedScenarios();
  const { assignScenarioToUsers, getScenarioStats, assignments } = useScenarioAssignments();
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  const [assignmentsListDialogOpen, setAssignmentsListDialogOpen] = useState(false);
  const [loadingPredefined, setLoadingPredefined] = useState(false);
  const [scenarioStats, setScenarioStats] = useState<Record<string, ScenarioStats>>({});
  
  // Selección múltiple para eliminación masiva
  const [selectedScenarios, setSelectedScenarios] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filtros de búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all'); // all, assigned, pending

  // Load scenario statistics
  useEffect(() => {
    const loadStats = async () => {
      const stats: Record<string, ScenarioStats> = {};
      for (const scenario of scenarios) {
        stats[scenario.id] = await getScenarioStats(scenario.id);
      }
      setScenarioStats(stats);
    };
    
    if (scenarios.length > 0) {
      loadStats();
    }
  }, [scenarios, getScenarioStats]);

  // Listen for account changes and refresh data
  useEffect(() => {
    const handleAccountChange = () => {
      refetch();
    };
    
    window.addEventListener('accountChanged', handleAccountChange);
    return () => window.removeEventListener('accountChanged', handleAccountChange);
  }, [refetch]);

  const handleEdit = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedScenario(null);
    setDialogOpen(true);
  };

  const handleAssign = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setAssignmentDialogOpen(true);
  };

  const handleViewAssignments = (scenario: TrainingScenario) => {
    setSelectedScenario(scenario);
    setAssignmentsListDialogOpen(true);
  };

  const handlePendingAssignmentsClick = () => {
    setAssignmentFilter('pending');
    setSearchTerm('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este escenario?')) {
      await deleteScenario(id);
      setSelectedScenarios(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedScenarios.size === 0) {
      toast.error('Selecciona al menos un escenario para eliminar');
      return;
    }

    if (!confirm(`¿Estás seguro de que deseas eliminar ${selectedScenarios.size} escenario(s)?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const deletePromises = Array.from(selectedScenarios).map(id => 
        supabase.from('training_scenarios').delete().eq('id', id)
      );
      
      await Promise.all(deletePromises);
      
      toast.success(`${selectedScenarios.size} escenario(s) eliminado(s) exitosamente`);
      setSelectedScenarios(new Set());
      refetch();
    } catch (error) {
      console.error('Error deleting scenarios:', error);
      toast.error('Error al eliminar los escenarios');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedScenarios.size === filteredScenarios.length) {
      setSelectedScenarios(new Set());
    } else {
      setSelectedScenarios(new Set(filteredScenarios.map(s => s.id)));
    }
  };

  const handleSelectScenario = (id: string) => {
    setSelectedScenarios(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isSuperAdmin = user?.role === 'superAdmin';

  const handleLoadPredefined = async () => {
    if (!selectedAccountId) {
      toast.error('Debe seleccionar una cuenta primero');
      return;
    }

    if (confirm('¿Deseas cargar los 20 escenarios predefinidos? Esto puede tomar unos minutos.')) {
      setLoadingPredefined(true);
      try {
        const { data: user } = await supabase.auth.getUser();
        
        for (const scenario of predefinedScenarios) {
          const scenarioData = {
            ...scenario, // Incluye TODOS los campos: evaluation_criteria, knowledge_base, etc.
            account_id: selectedAccountId,
            created_by: user.user?.id,
            // Solo sobrescribir campos vacíos si es necesario
            voice_id: scenario.voice_id || '',
            voice_name: scenario.voice_name || '',
            knowledge_documents: scenario.knowledge_documents || []
          };
          await createScenario(scenarioData);
          // Small delay to avoid overwhelming the database
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        toast.success('Escenarios predefinidos cargados exitosamente');
      } catch (error) {
        console.error('Error loading predefined scenarios:', error);
        toast.error('Error al cargar los escenarios predefinidos');
      } finally {
        setLoadingPredefined(false);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPersonalityColor = (type: string) => {
    switch (type) {
      case 'friendly': return 'bg-blue-100 text-blue-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      case 'suspicious': return 'bg-orange-100 text-orange-800';
      case 'aggressive': return 'bg-red-100 text-red-800';
      case 'hurried': return 'bg-purple-100 text-purple-800';
      case 'curious': return 'bg-green-100 text-green-800';
      case 'skeptical': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Alertas de asignaciones pendientes
  const getAssignmentAlerts = () => {
    const alerts: { scenario: TrainingScenario; pending: number; assigned: number }[] = [];
    
    scenarios.forEach(scenario => {
      const stats = scenarioStats[scenario.id];
      if (stats && stats.assigned_count > 0) {
        const pending = stats.assigned_count - stats.completed_assignments;
        if (pending > 0) {
          alerts.push({
            scenario,
            pending,
            assigned: stats.assigned_count
          });
        }
      }
    });
    
    return alerts;
  };

  // Filtrar escenarios
  const filteredScenarios = scenarios.filter(scenario => {
    const matchesSearch = scenario.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         scenario.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || scenario.category === categoryFilter;
    const matchesDifficulty = difficultyFilter === 'all' || scenario.difficulty === difficultyFilter;
    
    let matchesAssignment = true;
    if (assignmentFilter === 'assigned') {
      const stats = scenarioStats[scenario.id];
      matchesAssignment = stats && stats.assigned_count > 0;
    } else if (assignmentFilter === 'pending') {
      const stats = scenarioStats[scenario.id];
      matchesAssignment = stats && (stats.assigned_count - stats.completed_assignments) > 0;
    }
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesAssignment;
  });

  // Obtener categorías y dificultades únicas
  const categories = [...new Set(scenarios.map(s => s.category))].sort();
  const difficulties = ['beginner', 'intermediate', 'advanced'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const assignmentAlerts = getAssignmentAlerts();

  return (
    <div className="space-y-6">
      {/* Header con filtros */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Gestión de Escenarios</h3>
            <p className="text-sm text-muted-foreground">
              Crea y gestiona escenarios de entrenamiento para los agentes
            </p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && selectedScenarios.size > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleBulkDelete}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {isDeleting ? 'Eliminando...' : `Eliminar ${selectedScenarios.size}`}
              </Button>
            )}
            <Button 
              variant="outline" 
              onClick={handleLoadPredefined}
              disabled={loadingPredefined || scenarios.length > 0}
            >
              <Upload className="h-4 w-4 mr-2" />
              {loadingPredefined ? 'Cargando...' : 'Cargar 20 Escenarios'}
            </Button>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Escenario
            </Button>
          </div>
        </div>

        {/* Filtros de búsqueda */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Input
            placeholder="Buscar escenarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="md:col-span-2"
          />
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorías</SelectItem>
              {categories.filter(category => category && category.trim() !== '').map(category => (
                <SelectItem key={category} value={category}>{category}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Dificultad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {difficulties.filter(difficulty => difficulty && difficulty.trim() !== '').map(difficulty => (
                <SelectItem key={difficulty} value={difficulty}>
                  {difficulty === 'beginner' ? 'Principiante' : 
                   difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assignmentFilter} onValueChange={setAssignmentFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Asignaciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="assigned">Con asignaciones</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Alertas de asignaciones pendientes */}
      {assignmentAlerts.length > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Asignaciones Pendientes
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePendingAssignmentsClick}
                className="ml-auto text-orange-700 hover:text-orange-900"
              >
                Ver pendientes
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {assignmentAlerts.map(alert => (
                <div key={alert.scenario.id} className="text-sm text-orange-700">
                  <strong>{alert.scenario.name}:</strong> Asignado a {alert.assigned} usuario
                  {alert.assigned > 1 ? 's' : ''}, completado por {alert.assigned - alert.pending}, 
                  faltan <strong>{alert.pending}</strong>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selección múltiple header */}
      {isSuperAdmin && filteredScenarios.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Checkbox 
                checked={selectedScenarios.size === filteredScenarios.length && filteredScenarios.length > 0}
                onCheckedChange={handleSelectAll}
                id="select-all"
              />
              <label 
                htmlFor="select-all"
                className="text-sm font-medium cursor-pointer"
              >
                Seleccionar todos ({filteredScenarios.length})
              </label>
              {selectedScenarios.size > 0 && (
                <span className="text-sm text-muted-foreground ml-auto">
                  {selectedScenarios.size} seleccionado(s)
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredScenarios.map((scenario) => (
          <Card key={scenario.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                {isSuperAdmin && (
                  <Checkbox 
                    checked={selectedScenarios.has(scenario.id)}
                    onCheckedChange={() => handleSelectScenario(scenario.id)}
                    className="mt-1"
                  />
                )}
                <CardTitle className="text-base flex-1">{scenario.name}</CardTitle>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(scenario)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(scenario.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {scenario.description}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className={getDifficultyColor(scenario.difficulty)}>
                  {scenario.difficulty === 'beginner' ? 'Principiante' : 
                   scenario.difficulty === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                </Badge>
                <Badge variant="outline" className={getPersonalityColor(scenario.client_personality.type)}>
                  {scenario.client_personality.type}
                </Badge>
                <Badge variant="outline">
                  {scenario.category}
                </Badge>
              </div>

              {/* Estadísticas del escenario */}
              {scenarioStats[scenario.id] && (
                <div className="grid grid-cols-2 gap-2 text-xs bg-muted/50 p-2 rounded">
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    <span>{scenarioStats[scenario.id].total_sessions} sesiones</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Target className="h-3 w-3" />
                    <span>{Math.round(scenarioStats[scenario.id].avg_score)}% promedio</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>{Math.round(scenarioStats[scenario.id].avg_duration_minutes)}min promedio</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    <span>{scenarioStats[scenario.id].assigned_count} asignados</span>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-muted-foreground">
                <div>Duración: {scenario.duration_minutes} min</div>
                <div>Objetivos: {scenario.objectives.length}</div>
                <div>Documentos: {scenario.knowledge_documents.length}</div>
              </div>

              {scenario.voice_name && (
                <div className="text-sm">
                  <span className="font-medium">Voz:</span> {scenario.voice_name}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleAssign(scenario)}
                >
                  <Users className="h-3 w-3 mr-1" />
                  Asignar
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => handleViewAssignments(scenario)}
                >
                  Ver asignados
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredScenarios.length === 0 && scenarios.length > 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron escenarios</h3>
              <p className="text-muted-foreground text-center mb-4">
                Prueba ajustando los filtros de búsqueda
              </p>
              <Button variant="outline" onClick={() => {
                setSearchTerm('');
                setCategoryFilter('all');
                setDifficultyFilter('all');
                setAssignmentFilter('all');
              }}>
                Limpiar filtros
              </Button>
            </CardContent>
          </Card>
        )}

        {scenarios.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay escenarios</h3>
              <p className="text-muted-foreground text-center mb-4">
                Crea tu primer escenario de entrenamiento para comenzar
              </p>
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Escenario
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <ScenarioDialog
        scenario={selectedScenario}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />

      <ScenarioAssignmentDialog
        scenario={selectedScenario}
        open={assignmentDialogOpen}
        onOpenChange={setAssignmentDialogOpen}
        onAssign={assignScenarioToUsers}
      />

      <AssignmentsListDialog
        scenario={selectedScenario}
        open={assignmentsListDialogOpen}
        onOpenChange={setAssignmentsListDialogOpen}
      />
    </div>
  );
}