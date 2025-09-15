
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Prompt {
  id: string;
  name: string;
  content: string;
  type: "summary" | "feedback";
}

interface Behavior {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  is_active: boolean;
}

interface PromptSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (config: { 
    summaryPrompt?: string; 
    feedbackPrompt?: string;
    selectedBehaviorIds?: string[];
  }) => void;
}

export default function PromptSelectionModal({
  open,
  onOpenChange,
  onConfirm
}: PromptSelectionModalProps) {
  const [summaryPrompts, setSummaryPrompts] = useState<Prompt[]>([]);
  const [feedbackPrompts, setFeedbackPrompts] = useState<Prompt[]>([]);
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [selectedSummaryPrompt, setSelectedSummaryPrompt] = useState<string>("");
  const [selectedFeedbackPrompt, setSelectedFeedbackPrompt] = useState<string>("");
  const [selectedBehaviorIds, setSelectedBehaviorIds] = useState<string[]>([]);
  const [customSummaryPrompt, setCustomSummaryPrompt] = useState<string>("");
  const [customFeedbackPrompt, setCustomFeedbackPrompt] = useState<string>("");
  const [loading, setLoading] = useState(false);
  
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  useEffect(() => {
    if (open && selectedAccountId && selectedAccountId !== 'all' && user) {
      loadData();
    }
  }, [open, selectedAccountId, user]);

  const loadData = async () => {
    if (!selectedAccountId || selectedAccountId === 'all' || !user) {
      console.warn("No specific account selected or user not authenticated");
      return;
    }

    setLoading(true);
    
    try {
      console.log("Loading data for account:", selectedAccountId);

      // Load prompts
      const { data: prompts, error: promptsError } = await supabase
        .from('prompts')
        .select('*')
        .eq('account_id', selectedAccountId)
        .order('name');

      if (promptsError) {
        console.error("Error loading prompts:", promptsError);
        toast.error("Error al cargar prompts");
      } else {
        const typedPrompts = (prompts || []).map(p => ({
          ...p,
          type: p.type as "summary" | "feedback"
        }));

        setSummaryPrompts(typedPrompts.filter(p => p.type === 'summary'));
        setFeedbackPrompts(typedPrompts.filter(p => p.type === 'feedback'));
      }

      // Load behaviors
      const { data: behaviorData, error: behaviorsError } = await supabase
        .from('behaviors')
        .select('*')
        .eq('is_active', true)
        .or(`account_id.eq.${selectedAccountId},account_id.is.null`)
        .order('name');

      if (behaviorsError) {
        console.error("Error loading behaviors:", behaviorsError);
        toast.error("Error al cargar comportamientos");
      } else {
        setBehaviors(behaviorData || []);
        // Select all behaviors by default
        setSelectedBehaviorIds((behaviorData || []).map(b => b.id));
      }

    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Error al cargar datos");
    } finally {
      setLoading(false);
    }
  };

  const handleBehaviorToggle = (behaviorId: string, checked: boolean) => {
    if (checked) {
      setSelectedBehaviorIds(prev => [...prev, behaviorId]);
    } else {
      setSelectedBehaviorIds(prev => prev.filter(id => id !== behaviorId));
    }
  };

  const handleSelectAllBehaviors = () => {
    if (selectedBehaviorIds.length === behaviors.length) {
      setSelectedBehaviorIds([]);
    } else {
      setSelectedBehaviorIds(behaviors.map(b => b.id));
    }
  };

  const handleConfirm = () => {
    const config: { 
      summaryPrompt?: string; 
      feedbackPrompt?: string;
      selectedBehaviorIds?: string[];
    } = {};

    if (selectedSummaryPrompt === "custom") {
      config.summaryPrompt = customSummaryPrompt.trim();
    } else if (selectedSummaryPrompt) {
      const prompt = summaryPrompts.find(p => p.id === selectedSummaryPrompt);
      config.summaryPrompt = prompt?.content;
    }

    if (selectedFeedbackPrompt === "custom") {
      config.feedbackPrompt = customFeedbackPrompt.trim();
    } else if (selectedFeedbackPrompt) {
      const prompt = feedbackPrompts.find(p => p.id === selectedFeedbackPrompt);
      config.feedbackPrompt = prompt?.content;
    }

    config.selectedBehaviorIds = selectedBehaviorIds;

    console.log("Final configuration:", config);

    onConfirm(config);
    onOpenChange(false);
    
    // Reset form
    setSelectedSummaryPrompt("");
    setSelectedFeedbackPrompt("");
    setCustomSummaryPrompt("");
    setCustomFeedbackPrompt("");
    setSelectedBehaviorIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Configurar Análisis de Llamadas</DialogTitle>
        </DialogHeader>

        {!selectedAccountId || selectedAccountId === 'all' ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Por favor selecciona una cuenta específica para configurar el análisis.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-4">
            <p>Cargando configuración para la cuenta seleccionada...</p>
          </div>
        ) : (
          <Tabs defaultValue="prompts" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="prompts">Prompts de Análisis</TabsTrigger>
              <TabsTrigger value="behaviors">Comportamientos</TabsTrigger>
            </TabsList>

            <TabsContent value="prompts" className="space-y-6 mt-4">
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  {/* Summary Prompt Section */}
                  <div className="space-y-3">
                    <Label htmlFor="summary-prompt" className="text-base font-semibold">
                      Prompt de Resumen (Opcional)
                    </Label>
                    <Select
                      value={selectedSummaryPrompt}
                      onValueChange={setSelectedSummaryPrompt}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un prompt de resumen o usa el predeterminado" />
                      </SelectTrigger>
                      <SelectContent>
                        {summaryPrompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Prompt personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {selectedSummaryPrompt === "custom" && (
                      <Textarea
                        placeholder="Escribe tu prompt personalizado para el resumen..."
                        value={customSummaryPrompt}
                        onChange={(e) => setCustomSummaryPrompt(e.target.value)}
                        className="min-h-[120px]"
                      />
                    )}
                    
                    {selectedSummaryPrompt && selectedSummaryPrompt !== "custom" && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          {summaryPrompts.find(p => p.id === selectedSummaryPrompt)?.content}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Feedback Prompt Section */}
                  <div className="space-y-3">
                    <Label htmlFor="feedback-prompt" className="text-base font-semibold">
                      Prompt de Feedback (Opcional)
                    </Label>
                    <Select
                      value={selectedFeedbackPrompt}
                      onValueChange={setSelectedFeedbackPrompt}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un prompt de feedback o usa el predeterminado" />
                      </SelectTrigger>
                      <SelectContent>
                        {feedbackPrompts.map((prompt) => (
                          <SelectItem key={prompt.id} value={prompt.id}>
                            {prompt.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="custom">Prompt personalizado</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {selectedFeedbackPrompt === "custom" && (
                      <Textarea
                        placeholder="Escribe tu prompt personalizado para el feedback..."
                        value={customFeedbackPrompt}
                        onChange={(e) => setCustomFeedbackPrompt(e.target.value)}
                        className="min-h-[120px]"
                      />
                    )}
                    
                    {selectedFeedbackPrompt && selectedFeedbackPrompt !== "custom" && (
                      <div className="p-3 bg-muted rounded-md">
                        <p className="text-sm">
                          {feedbackPrompts.find(p => p.id === selectedFeedbackPrompt)?.content}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="behaviors" className="space-y-4 mt-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Comportamientos a Analizar ({selectedBehaviorIds.length}/{behaviors.length})
                </Label>
                {behaviors.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSelectAllBehaviors}
                  >
                    {selectedBehaviorIds.length === behaviors.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </Button>
                )}
              </div>

              <ScrollArea className="h-[450px] border rounded-md p-4">
                {behaviors.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No hay comportamientos activos disponibles para la cuenta seleccionada.</p>
                    <p className="text-sm mt-2">Crea comportamientos activos para poder analizarlos.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {behaviors.map((behavior) => (
                      <div key={behavior.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                        <input
                          type="checkbox"
                          id={behavior.id}
                          checked={selectedBehaviorIds.includes(behavior.id)}
                          onChange={(e) => handleBehaviorToggle(behavior.id, e.target.checked)}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-1">
                          <label
                            htmlFor={behavior.id}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {behavior.name}
                          </label>
                          {behavior.description && (
                            <p className="text-xs text-muted-foreground">
                              {behavior.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                            {behavior.prompt.substring(0, 150)}...
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedBehaviorIds.length > 0 && (
              <span>{selectedBehaviorIds.length} comportamiento(s) seleccionado(s)</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!selectedAccountId || selectedAccountId === 'all'}
            >
              Procesar con Configuración
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
