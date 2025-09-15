
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Call, Tipificacion } from "@/lib/types";
import { Loader2, Tag, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// This is for form handling - not database values
type FormResultValue = "not_selected" | "venta" | "no venta";

// Type for updating calls that handles form values
type CallUpdateInput = Partial<Omit<Call, 'result'>> & {
  result?: FormResultValue | null;
};

interface CallEditFormProps {
  call: Call;
  onSubmit: (updatedCall: CallUpdateInput) => void;
  onCancel: () => void;
}

type Agent = {
  id: string;
  name: string;
  user_id: string;
};

export default function CallEditForm({
  call,
  onSubmit,
  onCancel,
}: CallEditFormProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [tipificaciones, setTipificaciones] = useState<Tipificacion[]>([]);
  const [formData, setFormData] = useState({
    agentId: call.agentId || "none",
    agentUserId: "",
    tipificacionId: call.tipificacionId || "none",
    result: (call.result ? call.result : "not_selected") as FormResultValue,
  });
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("agent");

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      
      try {
        console.log("Loading form data for call:", call.id);
        
        const { data: agentsData, error: agentsError } = await supabase
          .from("agents")
          .select("id, name, user_id")
          .order("name");

        if (agentsError) {
          console.error("Error loading agents:", agentsError);
          throw new Error(`Error loading agents: ${agentsError.message}`);
        }
        
        console.log("Loaded agents:", agentsData);

        const { data: tipificacionesData, error: tipificacionesError } = await supabase
          .from("tipificaciones")
          .select("*")
          .eq("is_active", true)
          .order("name");

        if (tipificacionesError) {
          console.error("Error loading tipificaciones:", tipificacionesError);
          throw new Error(`Error loading tipificaciones: ${tipificacionesError.message}`);
        }
        
        console.log("Loaded tipificaciones:", tipificacionesData);

        const formattedTipificaciones: Tipificacion[] = tipificacionesData.map(
          (tip) => ({
            id: tip.id,
            name: tip.name,
            description: tip.description || null,
            type: tip.type,
            isActive: tip.is_active,
            createdAt: tip.created_at,
            updatedAt: tip.updated_at,
          })
        );

        setAgents(agentsData || []);
        setTipificaciones(formattedTipificaciones);

        const selectedAgent = agentsData?.find(agent => agent.id === call.agentId);
        
        // Convert database value to form value
        let formResultValue: FormResultValue = "not_selected";
        if (call.result === "venta") formResultValue = "venta";
        else if (call.result === "no venta") formResultValue = "no venta";
        
        setFormData({
          agentId: call.agentId || "none",
          agentUserId: selectedAgent?.user_id || "",
          tipificacionId: call.tipificacionId || "none",
          result: formResultValue,
        });
        
        console.log("Form data initialized:", {
          agentId: call.agentId || "none",
          agentUserId: selectedAgent?.user_id || "",
          tipificacionId: call.tipificacionId || "none",
          result: formResultValue,
        });
      } catch (error) {
        console.error("Error loading form data:", error);
        setLoadError(error instanceof Error ? error.message : "Error desconocido");
        toast.error("Error cargando datos del formulario");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [call.agentId, call.tipificacionId, call.id, call.result]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      console.log("Form submission with data:", formData);
      
      let agentName = "Sin asignar";
      let selectedAgent = null;
      
      if (formData.agentId && formData.agentId !== "none") {
        selectedAgent = agents.find(agent => agent.id === formData.agentId);
        if (selectedAgent) {
          agentName = selectedAgent.name;
        }
      }

      // Create update object with properly typed result
      const updatedCallData: CallUpdateInput = {
        agentId: formData.agentId === "none" ? null : formData.agentId,
        agentName,
        tipificacionId: formData.tipificacionId === "none" ? null : formData.tipificacionId,
        result: formData.result,
      };

      console.log("Sending update with data:", updatedCallData);
      
      if (selectedAgent && formData.agentUserId && formData.agentUserId.trim() !== "") {
        console.log(`Updating agent ${selectedAgent.id} with user_id: ${formData.agentUserId}`);
        
        try {
          const { error: agentUpdateError } = await supabase
            .from('agents')
            .update({ user_id: formData.agentUserId })
            .eq('id', selectedAgent.id);
            
          if (agentUpdateError) {
            console.error("Error updating agent user_id:", agentUpdateError);
            toast.error("Error al actualizar ID de usuario del agente", { 
              id: "agent-update-error",
              description: agentUpdateError.message 
            });
          } else {
            console.log("Agent user_id updated successfully");
            toast.success("ID de usuario del agente actualizado correctamente", {
              id: "agent-update-success"
            });
          }
        } catch (agentError) {
          console.error("Exception updating agent user_id:", agentError);
        }
      }
      
      await onSubmit(updatedCallData);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Error al guardar cambios");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAgentChange = (value: string) => {
    console.log("Agent selection changed to:", value);
    const selectedAgent = agents.find(agent => agent.id === value);
    setFormData({ 
      ...formData, 
      agentId: value,
      agentUserId: selectedAgent?.user_id || formData.agentUserId
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  
  if (loadError) {
    return (
      <div className="py-4 text-center">
        <p className="text-red-500 mb-4">Error: {loadError}</p>
        <Button variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 pt-4">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="agent" className="flex items-center gap-2">
            <UserCircle className="h-4 w-4" />
            Asesor
          </TabsTrigger>
          <TabsTrigger value="tipificacion" className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Tipificación
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="agent" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Asignación de Asesor</CardTitle>
              <CardDescription>
                Asigna un asesor a esta llamada y opcionalmente su ID de usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent">Asesor</Label>
                <Select
                  value={formData.agentId || "none"}
                  onValueChange={handleAgentChange}
                >
                  <SelectTrigger id="agent">
                    <SelectValue placeholder="Seleccionar asesor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {agents.map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.agentId && formData.agentId !== "none" && (
                <div className="space-y-2">
                  <Label htmlFor="agentUserId">ID de usuario del asesor (opcional)</Label>
                  <Input
                    id="agentUserId"
                    value={formData.agentUserId || ""}
                    onChange={(e) => setFormData({ ...formData, agentUserId: e.target.value })}
                    placeholder="Ejemplo: HA_123_20, FR_202_10"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede contener cualquier texto alfanumérico (ej: HA_123_20, FR_202_10)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="tipificacion" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-md">Tipificación y Resultado</CardTitle>
              <CardDescription>
                Selecciona la tipificación y el resultado de la llamada
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tipificacion">Tipificación</Label>
                <Select
                  value={formData.tipificacionId || "none"}
                  onValueChange={(value) => {
                    console.log("Tipificacion selection changed to:", value);
                    setFormData({ ...formData, tipificacionId: value });
                  }}
                >
                  <SelectTrigger id="tipificacion">
                    <SelectValue placeholder="Seleccionar tipificación" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin tipificación</SelectItem>
                    {tipificaciones.map((tip) => (
                      <SelectItem key={tip.id} value={tip.id}>
                        {tip.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="resultado">Resultado</Label>
                <Select
                  value={formData.result}
                  onValueChange={(value) => {
                    setFormData({ ...formData, result: value as FormResultValue });
                  }}
                >
                  <SelectTrigger id="resultado">
                    <SelectValue placeholder="Seleccionar resultado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_selected">Sin resultado</SelectItem>
                    <SelectItem value="venta">Venta</SelectItem>
                    <SelectItem value="no venta">No venta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}
