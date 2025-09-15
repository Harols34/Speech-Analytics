
import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Call } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";

type FormResultValue = "not_selected" | "venta" | "no venta";

type CallUpdateInput = Partial<Omit<Call, 'result'>> & {
  result?: FormResultValue | null;
  statusSummary?: string;
};

interface EditCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: Call;
  onSubmit: (updatedCall: CallUpdateInput) => void;
}

export default function EditCallDialog({
  open,
  onOpenChange,
  call,
  onSubmit
}: EditCallDialogProps) {
  const [agentId, setAgentId] = useState<string>(call.agentId || "none");
  const [agentName, setAgentName] = useState<string>(call.agentName || "");
  const [tipificacionId, setTipificacionId] = useState<string>(call.tipificacionId || "none");
  const [result, setResult] = useState<FormResultValue>(call.result === "venta" ? "venta" : call.result === "no venta" ? "no venta" : "not_selected");
  const [statusSummary, setStatusSummary] = useState<string>(call.statusSummary || ""); // Add state for status summary
  const [agents, setAgents] = useState<Array<{
    id: string;
    name: string;
  }>>([]);
  const [tipificaciones, setTipificaciones] = useState<Array<{
    id: string;
    name: string;
    type: string;
  }>>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const [loadingTipificaciones, setLoadingTipificaciones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [manualAgentMode, setManualAgentMode] = useState(false);
  
  useEffect(() => {
    if (open) {
      setAgentId(call.agentId || "none");
      setAgentName(call.agentName || "");
      setTipificacionId(call.tipificacionId || "none");
      setResult(call.result === "venta" ? "venta" : call.result === "no venta" ? "no venta" : "not_selected");
      setStatusSummary(call.statusSummary || ""); // Reset status summary
      setManualAgentMode(!call.agentId || call.agentId === "none");
    }
  }, [open, call]);
  
  const loadAgents = async () => {
    setLoadingAgents(true);
    setError(null);
    try {
      const {
        data,
        error
      } = await supabase.from('agents').select('id, name').eq('status', 'active').order('name');
      if (error) {
        console.error("Error loading agents:", error);
        setError("Error al cargar agentes. Intente nuevamente.");
        throw error;
      }
      console.log("Loaded agents:", data);
      setAgents(data || []);
    } catch (error) {
      console.error("Failed to load agents:", error);
    } finally {
      setLoadingAgents(false);
    }
  };
  
  const loadTipificaciones = async () => {
    setLoadingTipificaciones(true);
    setError(null);
    try {
      const {
        data,
        error
      } = await supabase.from('tipificaciones').select('id, name, type').eq('is_active', true).order('name');
      if (error) {
        console.error("Error loading tipificaciones:", error);
        setError("Error al cargar tipificaciones. Intente nuevamente.");
        throw error;
      }
      setTipificaciones(data || []);
    } catch (error) {
      console.error("Failed to load tipificaciones:", error);
    } finally {
      setLoadingTipificaciones(false);
    }
  };
  
  const handleAgentChange = (value: string) => {
    if (value === "manual") {
      setManualAgentMode(true);
      setAgentId("none");
      // No resetear el nombre del agente para permitir edición manual
    } else {
      setManualAgentMode(false);
      setAgentId(value);
      if (value === "none") {
        setAgentName("Sin asignar");
      } else {
        const selectedAgent = agents.find(agent => agent.id === value);
        setAgentName(selectedAgent ? selectedAgent.name : "");
      }
    }
  };
  
  const handleSubmit = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // Ensure the status summary is max 4 words
      const trimmedSummary = statusSummary.trim();
      const wordCount = trimmedSummary.split(/\s+/).length;
      let finalSummary = trimmedSummary;
      
      if (wordCount > 4) {
        finalSummary = trimmedSummary.split(/\s+/).slice(0, 4).join(" ");
        toast.warning("El resumen se limitó a 4 palabras");
      }
      
      const updateData: CallUpdateInput = {
        agentId: manualAgentMode ? null : agentId === "none" ? null : agentId,
        agentName: agentName || "Sin asignar",
        tipificacionId: tipificacionId === "none" ? null : tipificacionId,
        result: result,
        statusSummary: finalSummary
      };
      await onSubmit(updateData);
      onOpenChange(false);
    } catch (error) {
      console.error("Error in handleSubmit:", error);
      setError("Error inesperado al guardar los cambios");
      toast.error("Error al guardar los cambios");
    } finally {
      setIsSaving(false);
    }
  };
  
  return <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar detalles de la llamada</DialogTitle>
        </DialogHeader>
        
        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-3 rounded-md mb-4 flex items-center">
            <AlertCircle className="h-4 w-4 mr-2" />
            <span className="text-sm">{error}</span>
          </div>}
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="agent" className="text-right">
              Agente
            </Label>
            <div className="col-span-3">
              <Select value={manualAgentMode ? "manual" : agentId} onValueChange={handleAgentChange} disabled={loadingAgents || isSaving}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar agente" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  <SelectItem value="manual">Ingreso manual</SelectItem>
                  {agents.map(agent => <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {manualAgentMode && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="agentName" className="text-right">
                Nombre
              </Label>
              <div className="col-span-3">
                <Input
                  id="agentName"
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  placeholder="Nombre del agente"
                  disabled={isSaving}
                />
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipificacion" className="text-right">
              Tipificación
            </Label>
            <div className="col-span-3">
              <Select value={tipificacionId} onValueChange={setTipificacionId} disabled={loadingTipificaciones || isSaving}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipificación" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin tipificación</SelectItem>
                  {tipificaciones.map(tipificacion => <SelectItem key={tipificacion.id} value={tipificacion.id}>
                      {tipificacion.name} ({tipificacion.type})
                    </SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="result" className="text-right">
              Resultado
            </Label>
            <div className="col-span-3">
              <Select value={result} onValueChange={(value: FormResultValue) => setResult(value)} disabled={isSaving}>
                <SelectTrigger id="result">
                  <SelectValue placeholder="Seleccionar resultado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_selected">Sin resultado</SelectItem>
                  <SelectItem value="venta">Venta</SelectItem>
                  <SelectItem value="no venta">No venta</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="statusSummary" className="text-right">
              Resumen (máx. 4 palabras)
            </Label>
            <div className="col-span-3">
              <Input
                id="statusSummary"
                value={statusSummary}
                onChange={(e) => setStatusSummary(e.target.value)}
                placeholder="Ej: servicio al cliente"
                disabled={isSaving}
              />
            </div>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>;
}
