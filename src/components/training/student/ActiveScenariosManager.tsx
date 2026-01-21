import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Play, MessageSquare, Mic, Clock, Target, Users, Filter, Settings, AlertCircle, Lock, Zap } from 'lucide-react';
import { useTrainingScenarios } from '@/hooks/useTrainingScenarios';
import { useScenarioAssignments } from '@/hooks/useScenarioAssignments';
import { TrainingScenario } from '@/lib/types/training';
import { TrainingChatDialog } from './TrainingChatDialog';
import { TrainingVoiceDialog } from './TrainingVoiceDialog';
import { TrainingVoiceWebRTCDialog } from './TrainingVoiceWebRTCDialog';
import { useAuth } from '@/context/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

type TrainingMode = 'chat' | 'voice';
type VoiceTechnology = 'tts' | 'webrtc';

export function ActiveScenariosManager() {
  const { scenarios, loading } = useTrainingScenarios();
  const { assignments, markAssignmentCompleted } = useScenarioAssignments();
  const { user } = useAuth();
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [trainingMode, setTrainingMode] = useState<TrainingMode>('chat');
  const [voiceTechnology, setVoiceTechnology] = useState<VoiceTechnology>('tts');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [chatDialogOpen, setChatDialogOpen] = useState(false);
  const [voiceDialogOpen, setVoiceDialogOpen] = useState(false);
  const [voiceWebRTCDialogOpen, setVoiceWebRTCDialogOpen] = useState(false);
  const [mandatoryAssignments, setMandatoryAssignments] = useState<any[]>([]);

  // Separar escenarios obligatorios de los regulares
  useEffect(() => {
    if (user?.id) {
      const userAssignments = assignments.filter(
        a => a.user_id === user.id && a.status === 'pending'
      );
      setMandatoryAssignments(userAssignments);
    }
  }, [assignments, user?.id]);

  const activeScenarios = scenarios.filter(s => s.is_active);
  const hasPendingMandatory = mandatoryAssignments.length > 0;

  // Get unique categories and difficulties
  const categories = useMemo(() => {
    const cats = [...new Set(activeScenarios.map(s => s.category))];
    return cats.sort();
  }, [activeScenarios]);

  const difficulties = ['beginner', 'intermediate', 'advanced'];

  // Obtener escenarios obligatorios
  const mandatoryScenarios = useMemo(() => {
    return scenarios.filter(scenario => 
      mandatoryAssignments.some(a => a.scenario_id === scenario.id)
    );
  }, [scenarios, mandatoryAssignments]);

  // Filter scenarios (solo los regulares si no hay obligatorios pendientes)
  const filteredScenarios = useMemo(() => {
    const scenariosToFilter = hasPendingMandatory ? [] : activeScenarios;
    return scenariosToFilter.filter(scenario => {
      const matchesCategory = categoryFilter === 'all' || scenario.category === categoryFilter;
      const matchesDifficulty = difficultyFilter === 'all' || scenario.difficulty === difficultyFilter;
      return matchesCategory && matchesDifficulty;
    });
  }, [activeScenarios, categoryFilter, difficultyFilter, hasPendingMandatory]);

  // Group scenarios by category
  const scenariosByCategory = useMemo(() => {
    if (categoryFilter !== 'all') {
      return { [categoryFilter]: filteredScenarios };
    }
    
    const groups: Record<string, TrainingScenario[]> = {};
    filteredScenarios.forEach(scenario => {
      if (!groups[scenario.category]) {
        groups[scenario.category] = [];
      }
      groups[scenario.category].push(scenario);
    });
    return groups;
  }, [filteredScenarios, categoryFilter]);

  const handleStartTraining = () => {
    if (!selectedScenario) return;
    
    if (trainingMode === 'chat') {
      setChatDialogOpen(true);
    } else {
      // Voice mode - choose technology
      if (voiceTechnology === 'webrtc') {
        setVoiceWebRTCDialogOpen(true);
      } else {
        setVoiceDialogOpen(true);
      }
    }
  };

  const handleTrainingCompleted = async () => {
    if (!selectedScenario || !user?.id) return;
    
    // Si es un escenario obligatorio, marcarlo como completado
    const assignment = mandatoryAssignments.find(a => a.scenario_id === selectedScenario.id);
    if (assignment) {
      try {
        await markAssignmentCompleted(assignment.id);
      } catch (error) {
        console.error('Error marking assignment completed:', error);
      }
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getPersonalityIcon = (type: string) => {
    switch (type) {
      case 'friendly': return '😊';
      case 'neutral': return '😐';
      case 'suspicious': return '🤨';
      case 'aggressive': return '😠';
      case 'hurried': return '⏰';
      case 'curious': return '🤔';
      case 'skeptical': return '😒';
      default: return '😐';
    }
  };

  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'Principiante';
      case 'intermediate': return 'Intermedio';
      case 'advanced': return 'Avanzado';
      default: return difficulty;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Fixed Header Bar */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b pb-4">
        <div className="flex flex-col gap-4">
          <div>
            <h3 className="text-lg font-semibold">Escenarios de Entrenamiento</h3>
            <p className="text-sm text-muted-foreground">
              Selecciona un escenario y modo de entrenamiento para comenzar
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            {/* Filters */}
            <div className="flex gap-2 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.filter(category => category && category.trim() !== '').map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Dificultad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {difficulties.filter(difficulty => difficulty && difficulty.trim() !== '').map(difficulty => (
                    <SelectItem key={difficulty} value={difficulty}>
                      {getDifficultyLabel(difficulty)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Training Mode Selector */}
            <div className="flex gap-2 items-center ml-auto">
              <Settings className="h-4 w-4 text-muted-foreground" />
              <Select value={trainingMode} onValueChange={(value: string) => setTrainingMode(value as TrainingMode)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="chat">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-3 w-3" />
                      Chat
                    </div>
                  </SelectItem>
                  <SelectItem value="voice">
                    <div className="flex items-center gap-2">
                      <Mic className="h-3 w-3" />
                      Voz
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* WebRTC Toggle for Voice Mode */}
              {trainingMode === 'voice' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-secondary/50 rounded-md border">
                  <Label htmlFor="webrtc-mode" className="text-xs cursor-pointer flex items-center gap-1">
                    {voiceTechnology === 'webrtc' ? (
                      <>
                        <Zap className="h-3 w-3 text-green-600" />
                        <span className="text-green-600 font-medium">WebRTC</span>
                      </>
                    ) : (
                      <>
                        <Mic className="h-3 w-3" />
                        <span>TTS</span>
                      </>
                    )}
                  </Label>
                  <Switch
                    id="webrtc-mode"
                    checked={voiceTechnology === 'webrtc'}
                    onCheckedChange={(checked) => setVoiceTechnology(checked ? 'webrtc' : 'tts')}
                  />
                </div>
              )}
              
              <Button 
                onClick={handleStartTraining}
                disabled={!selectedScenario}
                className="ml-2"
              >
                <Play className="h-4 w-4 mr-2" />
                Iniciar
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Escenarios Obligatorios */}
      {mandatoryScenarios.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            <h4 className="text-base font-medium text-orange-700">Entrenamientos Obligatorios</h4>
            <Badge variant="destructive" className="text-xs">
              {mandatoryAssignments.length} pendiente{mandatoryAssignments.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-700 mb-3">
              Debes completar estos entrenamientos antes de acceder a otros escenarios.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {mandatoryScenarios.map((scenario) => (
                <Card 
                  key={scenario.id} 
                  className={`cursor-pointer transition-all border-orange-300 ${
                    selectedScenario?.id === scenario.id 
                      ? 'ring-2 ring-orange-500 bg-orange-100' 
                      : 'hover:shadow-md bg-orange-25'
                  }`}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-sm font-medium leading-tight text-orange-800">
                        {scenario.name}
                      </CardTitle>
                      <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                    </div>
                    <p className="text-xs text-orange-600 line-clamp-2">
                      {scenario.description}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="space-y-3 pt-0">
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline" className={`text-xs ${getDifficultyColor(scenario.difficulty)}`}>
                        {getDifficultyLabel(scenario.difficulty)}
                      </Badge>
                      <Badge variant="outline" className="text-xs bg-orange-100 text-orange-800">
                        Obligatorio
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-orange-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{scenario.duration_minutes}min</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Target className="h-3 w-3" />
                        <span>{scenario.objectives.length} obj</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bloqueo de escenarios regulares si hay obligatorios pendientes */}
      {hasPendingMandatory && (
        <Card className="border-gray-300 bg-gray-50">
          <CardContent className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Lock className="h-8 w-8 text-gray-400 mx-auto" />
              <h3 className="font-medium text-gray-600">Escenarios Bloqueados</h3>
              <p className="text-sm text-gray-500">
                Completa todos los entrenamientos obligatorios para desbloquear el resto de escenarios
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scenarios by Category (solo si no hay obligatorios) */}
      {!hasPendingMandatory && Object.entries(scenariosByCategory).map(([category, categoryScenarios]) => (
        <div key={category} className="space-y-4">
          <div className="flex items-center gap-2">
            <h4 className="text-base font-medium">{category}</h4>
            <Badge variant="secondary" className="text-xs">
              {categoryScenarios.length} escenario{categoryScenarios.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {categoryScenarios.map((scenario) => (
              <Card 
                key={scenario.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedScenario?.id === scenario.id 
                    ? 'ring-2 ring-primary bg-primary/5' 
                    : 'hover:shadow-md'
                }`}
                onClick={() => setSelectedScenario(scenario)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-sm font-medium leading-tight">
                      {scenario.name}
                    </CardTitle>
                    <div className="text-lg flex-shrink-0">
                      {getPersonalityIcon(scenario.client_personality.type)}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {scenario.description}
                  </p>
                </CardHeader>
                
                <CardContent className="space-y-3 pt-0">
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={`text-xs ${getDifficultyColor(scenario.difficulty)}`}>
                      {getDifficultyLabel(scenario.difficulty)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {scenario.client_personality.type}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{scenario.duration_minutes}min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-3 w-3" />
                      <span>{scenario.objectives.length} obj</span>
                    </div>
                  </div>

                  {selectedScenario?.id === scenario.id && (
                    <div className="pt-2 border-t space-y-2">
                      <div>
                        <p className="text-xs font-medium">Objetivos principales:</p>
                        <ul className="text-xs text-muted-foreground space-y-1 mt-1">
                          {scenario.objectives.slice(0, 2).map((objective, index) => (
                            <li key={index} className="flex items-start gap-1">
                              <span className="text-primary">•</span>
                              <span>{objective}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <p className="text-xs font-medium">Personalidad del cliente:</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {scenario.client_personality.description}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}

      {filteredScenarios.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Play className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {activeScenarios.length === 0 
                ? 'No hay escenarios activos' 
                : 'No se encontraron escenarios'
              }
            </h3>
            <p className="text-muted-foreground text-center">
              {activeScenarios.length === 0 
                ? 'Los administradores deben activar escenarios para que aparezcan aquí'
                : 'Prueba ajustando los filtros para encontrar escenarios'
              }
            </p>
          </CardContent>
        </Card>
      )}

      {/* Training Dialogs */}
      {selectedScenario && (
        <>
          <TrainingChatDialog
            scenario={selectedScenario}
            open={chatDialogOpen}
            onOpenChange={setChatDialogOpen}
            onTrainingCompleted={handleTrainingCompleted}
          />
          <TrainingVoiceDialog
            scenario={selectedScenario}
            open={voiceDialogOpen}
            onOpenChange={setVoiceDialogOpen}
            onTrainingCompleted={handleTrainingCompleted}
          />
          <TrainingVoiceWebRTCDialog
            scenario={selectedScenario}
            open={voiceWebRTCDialogOpen}
            onOpenChange={setVoiceWebRTCDialogOpen}
            onTrainingCompleted={handleTrainingCompleted}
          />
        </>
      )}
    </div>
  );
}