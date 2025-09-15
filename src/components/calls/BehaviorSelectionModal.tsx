
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/context/AccountContext";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Behavior {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  is_active: boolean;
}

interface BehaviorSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selectedBehaviorIds: string[]) => void;
}

export default function BehaviorSelectionModal({
  open,
  onOpenChange,
  onConfirm
}: BehaviorSelectionModalProps) {
  const [behaviors, setBehaviors] = useState<Behavior[]>([]);
  const [selectedBehaviorIds, setSelectedBehaviorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { selectedAccountId } = useAccount();
  const { user } = useAuth();

  useEffect(() => {
    if (open && selectedAccountId && selectedAccountId !== 'all' && user) {
      loadBehaviors();
    }
  }, [open, selectedAccountId, user]);

  const loadBehaviors = async () => {
    if (!selectedAccountId || selectedAccountId === 'all' || !user) {
      console.warn("No specific account selected or user not authenticated");
      return;
    }

    setLoading(true);
    
    try {
      console.log("Loading behaviors for account:", selectedAccountId);

      const { data: behaviorData, error } = await supabase
        .from('behaviors')
        .select('*')
        .eq('is_active', true)
        .or(`account_id.eq.${selectedAccountId},account_id.is.null`)
        .order('name');

      if (error) {
        console.error("Error loading behaviors:", error);
        toast.error("Error al cargar comportamientos");
        return;
      }

      console.log("Loaded behaviors for account", selectedAccountId, ":", behaviorData?.length || 0);
      setBehaviors(behaviorData || []);

    } catch (error) {
      console.error("Error loading behaviors:", error);
      toast.error("Error al cargar comportamientos");
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

  const handleSelectAll = () => {
    if (selectedBehaviorIds.length === behaviors.length) {
      setSelectedBehaviorIds([]);
    } else {
      setSelectedBehaviorIds(behaviors.map(b => b.id));
    }
  };

  const handleConfirm = () => {
    console.log("Selected behavior IDs:", selectedBehaviorIds);
    onConfirm(selectedBehaviorIds);
    onOpenChange(false);
    setSelectedBehaviorIds([]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Seleccionar Comportamientos para Análisis</DialogTitle>
        </DialogHeader>

        {!selectedAccountId || selectedAccountId === 'all' ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">
              Por favor selecciona una cuenta específica para ver los comportamientos disponibles.
            </p>
          </div>
        ) : loading ? (
          <div className="text-center py-4">
            <p>Cargando comportamientos para la cuenta seleccionada...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Comportamientos Disponibles ({behaviors.length})
              </Label>
              {behaviors.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedBehaviorIds.length === behaviors.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                </Button>
              )}
            </div>

            <ScrollArea className="h-[400px] border rounded-md p-4">
              {behaviors.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No hay comportamientos activos disponibles para la cuenta seleccionada.</p>
                  <p className="text-sm mt-2">Crea comportamientos activos para poder analizarlos.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {behaviors.map((behavior) => (
                    <div key={behavior.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={behavior.id}
                        checked={selectedBehaviorIds.includes(behavior.id)}
                        onCheckedChange={(checked) => handleBehaviorToggle(behavior.id, checked === true)}
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
                          {behavior.prompt.substring(0, 100)}...
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>

            <div className="text-sm text-muted-foreground">
              {selectedBehaviorIds.length > 0 
                ? `${selectedBehaviorIds.length} comportamiento(s) seleccionado(s)`
                : "Ningún comportamiento seleccionado"
              }
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={!selectedAccountId || selectedAccountId === 'all' || selectedBehaviorIds.length === 0}
          >
            Analizar Comportamientos Seleccionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
