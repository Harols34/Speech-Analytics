import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainingScenario, ClientPersonality, EvaluationCriterion, CallCompletionRules } from '@/lib/types/training';
import { useTrainingScenarios } from '@/hooks/useTrainingScenarios';
import { useAccount } from '@/context/AccountContext';
import { X, Plus, Sparkles, Target, BookOpen, FileText, Phone, Wand2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ScenarioDialogProps {
  scenario: TrainingScenario | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CATEGORIES = ['Ventas', 'Atención al Cliente', 'Recursos Humanos', 'Negociación', 'Educación', 'Reclutamiento', 'Onboarding', 'Offboarding'];

export function ScenarioDialog({
  scenario,
  open,
  onOpenChange
}: ScenarioDialogProps) {
  const {
    createScenario,
    updateScenario
  } = useTrainingScenarios();
  const {
    selectedAccountId
  } = useAccount();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    difficulty: 'intermediate' as TrainingScenario['difficulty'],
    client_personality: {
      type: 'neutral' as ClientPersonality['type'],
      description: '',
      traits: [] as string[]
    },
    objectives: [] as string[],
    context: '',
    is_active: true,
    evaluation_criteria: [] as EvaluationCriterion[],
    knowledge_base: '',
    custom_evaluation_instructions: '',
    expected_outcome: '',
    call_completion_rules: {
      success_message: '¡Excelente trabajo! Has completado el escenario exitosamente. Finaliza la llamada, califica y cierra el escenario.',
      failure_message: 'Disculpa, no tengo más tiempo. Gracias.',
      auto_close_on_failure: true
    } as CallCompletionRules
  });
  const [improvingDescription, setImprovingDescription] = useState(false);
  const [newObjective, setNewObjective] = useState('');
  const [newTrait, setNewTrait] = useState('');
  const [newCriterion, setNewCriterion] = useState({ name: '', description: '', weight: 0 });
  const [aiIntention, setAiIntention] = useState('');
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);

  // Construir contexto automáticamente
  useEffect(() => {
    const buildContext = () => {
      const parts = [];
      if (formData.description) {
        parts.push(`Descripción del escenario: ${formData.description}`);
      }
      if (formData.difficulty) {
        const difficultyText = formData.difficulty === 'beginner' ? 'principiante' : formData.difficulty === 'intermediate' ? 'intermedio' : 'avanzado';
        parts.push(`Nivel de dificultad: ${difficultyText}`);
      }
      if (formData.client_personality.type) {
        parts.push(`Tipo de personalidad del cliente: ${formData.client_personality.type}`);
      }
      if (formData.client_personality.description) {
        parts.push(`Descripción de personalidad: ${formData.client_personality.description}`);
      }
      if (formData.client_personality.traits.length > 0) {
        parts.push(`Características del cliente: ${formData.client_personality.traits.join(', ')}`);
      }
      const context = parts.join('. ') + (parts.length > 0 ? '.' : '');
      setFormData(prev => ({
        ...prev,
        context
      }));
    };
    buildContext();
  }, [formData.description, formData.difficulty, formData.client_personality]);
  useEffect(() => {
    if (scenario) {
      setFormData({
        name: scenario.name,
        description: scenario.description,
        category: scenario.category,
        difficulty: scenario.difficulty,
        client_personality: scenario.client_personality,
        objectives: scenario.objectives,
        context: scenario.context,
        is_active: scenario.is_active,
        evaluation_criteria: scenario.evaluation_criteria || [],
        knowledge_base: scenario.knowledge_base || '',
        custom_evaluation_instructions: scenario.custom_evaluation_instructions || '',
        expected_outcome: scenario.expected_outcome || '',
        call_completion_rules: scenario.call_completion_rules || {
          success_message: '¡Excelente trabajo! Has completado el escenario exitosamente.',
          failure_message: 'Disculpa, no tengo más tiempo. Gracias.',
          auto_close_on_failure: true
        }
      });
    } else {
      // Reset for new scenario
      setFormData({
        name: '',
        description: '',
        category: '',
        difficulty: 'intermediate',
        client_personality: {
          type: 'neutral',
          description: '',
          traits: []
        },
        objectives: [],
        context: '',
        is_active: true,
        evaluation_criteria: [],
        knowledge_base: '',
        custom_evaluation_instructions: '',
        expected_outcome: '',
        call_completion_rules: {
          success_message: '¡Excelente trabajo! Has completado el escenario exitosamente.',
          failure_message: 'Disculpa, no tengo más tiempo. Gracias.',
          auto_close_on_failure: true
        }
      });
    }
  }, [scenario, open]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const scenarioData = {
        ...formData,
        duration_minutes: 15,
        // Default duration
        knowledge_documents: [],
        // Default empty array
        voice_id: '',
        // Will be set by global voice selection
        voice_name: '',
        // Will be set by global voice selection
        account_id: selectedAccountId,
        created_by: (await supabase.auth.getUser()).data.user?.id
      };
      if (scenario) {
        await updateScenario(scenario.id, scenarioData);
      } else {
        await createScenario(scenarioData);
      }
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving scenario:', error);
    }
  };
  const improveAgentBehavior = async () => {
    if (!formData.description.trim()) {
      toast.error('Primero escribe una descripción del escenario');
      return;
    }
    setImprovingDescription(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('improve-prompt', {
        body: {
          content: formData.description,
          type: 'agent_behavior',
          context: `Escenario: ${formData.name || 'Entrenamiento'}
Categoría: ${formData.category || 'General'}
Dificultad: ${formData.difficulty}
Personalidad del cliente: ${formData.client_personality.type}
Características: ${formData.client_personality.traits.join(', ')}`,
          instruction: 'Mejora esta descripción para que el agente virtual tenga un comportamiento más realista, coherente y efectivo en el entrenamiento. Enfócate en cómo debe actuar, responder y comportarse el agente para crear una experiencia de entrenamiento óptima.'
        }
      });
      if (error) throw error;
      setFormData(prev => ({
        ...prev,
        description: data.improvedContent
      }));
      toast.success('Comportamiento del agente mejorado automáticamente');
    } catch (error) {
      console.error('Error improving agent behavior:', error);
      toast.error('Error al mejorar el comportamiento del agente');
    } finally {
      setImprovingDescription(false);
    }
  };
  const addObjective = () => {
    if (newObjective.trim()) {
      setFormData(prev => ({
        ...prev,
        objectives: [...prev.objectives, newObjective.trim()]
      }));
      setNewObjective('');
    }
  };
  const removeObjective = (index: number) => {
    setFormData(prev => ({
      ...prev,
      objectives: prev.objectives.filter((_, i) => i !== index)
    }));
  };
  const addTrait = () => {
    if (newTrait.trim()) {
      setFormData(prev => ({
        ...prev,
        client_personality: {
          ...prev.client_personality,
          traits: [...prev.client_personality.traits, newTrait.trim()]
        }
      }));
      setNewTrait('');
    }
  };
  const removeTrait = (index: number) => {
    setFormData(prev => ({
      ...prev,
      client_personality: {
        ...prev.client_personality,
        traits: prev.client_personality.traits.filter((_, i) => i !== index)
      }
    }));
  };

  const addCriterion = () => {
    if (newCriterion.name.trim() && newCriterion.weight > 0) {
      const criterion: EvaluationCriterion = {
        id: crypto.randomUUID(),
        name: newCriterion.name.trim(),
        description: newCriterion.description.trim(),
        weight: newCriterion.weight
      };
      setFormData(prev => ({
        ...prev,
        evaluation_criteria: [...prev.evaluation_criteria, criterion]
      }));
      setNewCriterion({ name: '', description: '', weight: 0 });
    }
  };

  const removeCriterion = (id: string) => {
    setFormData(prev => ({
      ...prev,
      evaluation_criteria: prev.evaluation_criteria.filter(c => c.id !== id)
    }));
  };

  const generateWithAI = async () => {
    if (!aiIntention.trim()) {
      toast.error('Por favor, describe la intención del escenario');
      return;
    }

    setGeneratingWithAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-training-scenario', {
        body: {
          intention: aiIntention,
          category: formData.category || undefined
        }
      });

      if (error) throw error;

      if (data?.scenario) {
        const generated = data.scenario;
        
        setFormData(prev => ({
          ...prev,
          name: generated.name || prev.name,
          description: generated.description || prev.description,
          category: generated.category || prev.category,
          difficulty: generated.difficulty || prev.difficulty,
          client_personality: {
            type: generated.client_personality?.type || prev.client_personality.type,
            description: generated.client_personality?.description || prev.client_personality.description,
            traits: generated.client_personality?.traits || prev.client_personality.traits
          },
          objectives: generated.objectives || prev.objectives,
          evaluation_criteria: generated.evaluation_criteria || prev.evaluation_criteria,
          knowledge_base: generated.knowledge_base || prev.knowledge_base,
          custom_evaluation_instructions: generated.custom_evaluation_instructions || prev.custom_evaluation_instructions,
          expected_outcome: generated.expected_outcome || prev.expected_outcome,
          call_completion_rules: {
            success_message: generated.call_completion_rules?.success_message || prev.call_completion_rules.success_message,
            failure_message: generated.call_completion_rules?.failure_message || prev.call_completion_rules.failure_message,
            auto_close_on_failure: generated.call_completion_rules?.auto_close_on_failure ?? prev.call_completion_rules.auto_close_on_failure
          }
        }));

        setShowAIGenerator(false);
        setAiIntention('');
        toast.success('Escenario generado con IA. Revisa y ajusta los campos según necesites.');
      }
    } catch (error) {
      console.error('Error generating scenario with AI:', error);
      toast.error('Error al generar el escenario con IA');
    } finally {
      setGeneratingWithAI(false);
    }
  };

  const totalWeight = formData.evaluation_criteria.reduce((sum, c) => sum + c.weight, 0);
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {scenario ? 'Editar Escenario' : 'Nuevo Escenario'}
          </DialogTitle>
          <DialogDescription>
            {scenario ? 'Modifica los parámetros del escenario de entrenamiento.' : 'Crea un nuevo escenario de entrenamiento con objetivos y criterios de evaluación dinámicos.'}
          </DialogDescription>
        </DialogHeader>

        {/* AI Generator Section */}
        {!scenario && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  Generar con IA
                </CardTitle>
                <Button
                  type="button"
                  variant={showAIGenerator ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setShowAIGenerator(!showAIGenerator)}
                >
                  {showAIGenerator ? 'Ocultar' : 'Usar IA'}
                </Button>
              </div>
            </CardHeader>
            {showAIGenerator && (
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Describe la intención del escenario y la IA generará automáticamente todos los campos.
                </p>
                <Textarea
                  placeholder='Ejemplo: "Crear un módulo llamado Venta de Servicios Móviles en el que un cliente apurado desea contratar servicios móviles económicos. El cliente debe ser escéptico pero abierto a ofertas convincentes."'
                  value={aiIntention}
                  onChange={(e) => setAiIntention(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <Button
                  type="button"
                  onClick={generateWithAI}
                  disabled={generatingWithAI || !aiIntention.trim()}
                  className="w-full"
                >
                  {generatingWithAI ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generando escenario...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generar Escenario Completo
                    </>
                  )}
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="basic">Básico</TabsTrigger>
              <TabsTrigger value="evaluation">Evaluación</TabsTrigger>
              <TabsTrigger value="knowledge">Conocimiento</TabsTrigger>
              <TabsTrigger value="completion">Finalización</TabsTrigger>
            </TabsList>

            <TabsContent value="basic" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del Escenario</Label>
              <Input id="name" value={formData.name} onChange={e => setFormData(prev => ({
              ...prev,
              name: e.target.value
            }))} required />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <Select value={formData.category} onValueChange={value => setFormData(prev => ({
              ...prev,
              category: value
            }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(category => <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="description">Descripción</Label>
              
            </div>
            <Textarea id="description" value={formData.description} onChange={e => setFormData(prev => ({
            ...prev,
            description: e.target.value
          }))} rows={3} required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="difficulty">Dificultad</Label>
            <Select value={formData.difficulty} onValueChange={(value: any) => setFormData(prev => ({
            ...prev,
            difficulty: value
          }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="beginner">Principiante</SelectItem>
                <SelectItem value="intermediate">Intermedio</SelectItem>
                <SelectItem value="advanced">Avanzado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personalidad del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="personality-type">Tipo de Personalidad</Label>
                  <Select value={formData.client_personality.type} onValueChange={(value: any) => setFormData(prev => ({
                  ...prev,
                  client_personality: {
                    ...prev.client_personality,
                    type: value
                  }
                }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="friendly">Amigable</SelectItem>
                      <SelectItem value="suspicious">Desconfiado</SelectItem>
                      <SelectItem value="hurried">Apurado</SelectItem>
                      <SelectItem value="curious">Curioso</SelectItem>
                      <SelectItem value="skeptical">Escéptico</SelectItem>
                      <SelectItem value="aggressive">Agresivo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="personality-desc">Descripción Personalidad</Label>
                  <Input id="personality-desc" value={formData.client_personality.description} onChange={e => setFormData(prev => ({
                  ...prev,
                  client_personality: {
                    ...prev.client_personality,
                    description: e.target.value
                  }
                }))} placeholder="Breve descripción del comportamiento" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Características del Cliente</Label>
                <div className="flex gap-2">
                  <Input value={newTrait} onChange={e => setNewTrait(e.target.value)} placeholder="ej: impaciente, exigente..." onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addTrait())} />
                  <Button type="button" onClick={addTrait}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.client_personality.traits.map((trait, index) => <div key={index} className="flex items-center gap-1 bg-secondary px-2 py-1 rounded">
                      <span className="text-sm">{trait}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeTrait(index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>)}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="context">Contexto del Escenario</Label>
            <Textarea id="context" value={formData.context} readOnly rows={4} className="bg-muted resize-none" placeholder="Se construye automáticamente basado en la descripción, dificultad y personalidad del cliente..." />
            <p className="text-xs text-muted-foreground">
              * El contexto se genera automáticamente y será utilizado por el Modelo_Voz_convert-IA para actuar como el agente virtual
            </p>
          </div>

              <div className="space-y-2">
                <Label>Objetivos de Aprendizaje</Label>
                <div className="flex gap-2">
                  <Input value={newObjective} onChange={e => setNewObjective(e.target.value)} placeholder="Agregar objetivo..." onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addObjective())} />
                  <Button type="button" onClick={addObjective}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="space-y-2 mt-2">
                  {formData.objectives.map((objective, index) => <div key={index} className="flex items-center gap-2 bg-secondary p-2 rounded">
                      <span className="flex-1 text-sm">{objective}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeObjective(index)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>)}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="evaluation" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Criterios de Evaluación Dinámicos
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Define los aspectos específicos que deseas evaluar y su peso relativo en la calificación final.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <Input 
                      placeholder="Nombre del criterio" 
                      value={newCriterion.name}
                      onChange={e => setNewCriterion(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input 
                      placeholder="Descripción" 
                      value={newCriterion.description}
                      onChange={e => setNewCriterion(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="flex gap-2">
                      <Input 
                        type="number" 
                        placeholder="Peso %" 
                        min="0" 
                        max="100"
                        value={newCriterion.weight || ''}
                        onChange={e => setNewCriterion(prev => ({ ...prev, weight: parseInt(e.target.value) || 0 }))}
                      />
                      <Button type="button" onClick={addCriterion}>
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {formData.evaluation_criteria.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Total: {totalWeight}%</span>
                        {totalWeight !== 100 && (
                          <span className="text-sm text-amber-600">⚠️ El peso total debe ser 100%</span>
                        )}
                      </div>
                      {formData.evaluation_criteria.map(criterion => (
                        <div key={criterion.id} className="flex items-center gap-2 bg-secondary p-3 rounded">
                          <div className="flex-1">
                            <div className="font-medium">{criterion.name} ({criterion.weight}%)</div>
                            <div className="text-sm text-muted-foreground">{criterion.description}</div>
                          </div>
                          <Button type="button" variant="ghost" size="sm" onClick={() => removeCriterion(criterion.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Instrucciones de Evaluación Personalizadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Ejemplo: Evalúa cómo el asesor gestiona la conversación, maneja objeciones y cierra con una propuesta convincente. Presta atención a su capacidad de escucha activa y adaptación al tono del cliente."
                    value={formData.custom_evaluation_instructions}
                    onChange={e => setFormData(prev => ({ ...prev, custom_evaluation_instructions: e.target.value }))}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Estas instrucciones se integrarán dinámicamente al evaluador IA para personalizar la calificación.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Resultado Esperado del Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Ejemplo: Después de 4 objeciones correctamente gestionadas, el cliente acepta la oferta y se realiza una venta efectiva. El cliente debe sentirse escuchado y convencido de los beneficios."
                    value={formData.expected_outcome}
                    onChange={e => setFormData(prev => ({ ...prev, expected_outcome: e.target.value }))}
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    La IA interpretará este flujo como el resultado ideal (nota 100%) si se cumple la simulación esperada.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="knowledge" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Base de Conocimiento del Escenario
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder={`Ejemplo:
PLANES VÁLIDOS:
- Plan 1: Internet 100MB - $45.000/mes
- Plan 2: Telefonía ilimitada - $98.000/mes  
- Plan 3: TV + Internet - $120.000/mes

POLÍTICAS:
- Descuento máximo permitido: 10%
- Plazo de instalación: 5-7 días hábiles

ERRORES QUE SE CALIFICAN CON 0 PUNTOS:
- Ofrecer planes que no existen
- Mencionar precios incorrectos
- Prometer plazos no autorizados`}
                    value={formData.knowledge_base}
                    onChange={e => setFormData(prev => ({ ...prev, knowledge_base: e.target.value }))}
                    rows={12}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Documenta información clave que el evaluador IA usará para validar la precisión de las respuestas del asesor.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="completion" className="space-y-4 mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Phone className="h-5 w-5" />
                    Reglas de Finalización de Llamada
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Mensaje de Cierre Exitoso</Label>
                    <Textarea
                      placeholder="Mensaje que el AV mostrará cuando se complete exitosamente el escenario"
                      value={formData.call_completion_rules.success_message}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        call_completion_rules: {
                          ...prev.call_completion_rules,
                          success_message: e.target.value
                        }
                      }))}
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Mensaje de Cierre No Exitoso</Label>
                    <Textarea
                      placeholder="Mensaje que el AV dirá antes de finalizar cuando no se logra el objetivo"
                      value={formData.call_completion_rules.failure_message}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        call_completion_rules: {
                          ...prev.call_completion_rules,
                          failure_message: e.target.value
                        }
                      }))}
                      rows={2}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="auto-close"
                      checked={formData.call_completion_rules.auto_close_on_failure}
                      onChange={e => setFormData(prev => ({
                        ...prev,
                        call_completion_rules: {
                          ...prev.call_completion_rules,
                          auto_close_on_failure: e.target.checked
                        }
                      }))}
                      className="rounded"
                    />
                    <Label htmlFor="auto-close" className="cursor-pointer">
                      Cerrar automáticamente y calificar cuando no se logra el objetivo
                    </Label>
                  </div>

                  <div className="bg-muted p-3 rounded text-sm space-y-2">
                    <p className="font-medium">Comportamiento del AV:</p>
                    <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                      <li>Si se logra el objetivo: Felicita y permite cerrar manualmente</li>
                      <li>Si no se logra y está habilitado: Cierra automáticamente y califica</li>
                      <li>La calificación se genera según los criterios definidos</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">
              {scenario ? 'Actualizar' : 'Crear'} Escenario
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>;
}