
import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Edit, MessageSquare } from "lucide-react";
import { Call } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import CallHeader from "./CallHeader";
import AudioPlayer from "./AudioPlayer";
import CallDetailTabs from "./CallDetailTabs";
import EditCallDialog from "./EditCallDialog";
import CallDetailSkeleton from "./CallDetailSkeleton";
import CallNotFound from "./CallNotFound";
import CallChatDialog from "./CallChatDialog";
import { useCallData } from "@/hooks/useCallData";

// Define a form value type for handling the non-overlapping string values
type FormResultValue = "not_selected" | "venta" | "no venta";

// Define a type that extends Call but allows FormResultValue for result to handle form values
type CallUpdateInput = Partial<Omit<Call, 'result'>> & { 
  result?: FormResultValue | null;  // Allow form values here
};

export default function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const { call, setCall, isLoading, transcriptSegments } = useCallData(id);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showChatDialog, setShowChatDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCallUpdate = async (updatedCall: CallUpdateInput) => {
    if (!call || !id) return;
    
    setIsUpdating(true);
    
    try {
      console.log("Actualizando llamada con datos:", updatedCall);
      
      const updateData: Record<string, any> = {};
      
      // Manejo de agente, considerando el caso de ingreso manual
      if (updatedCall.agentName !== undefined) {
        updateData.agent_name = updatedCall.agentName;
      }
      
      // Si el agentId es null pero hay un agentName, es ingreso manual
      const isManualAssignment = updatedCall.agentId === null && updatedCall.agentName;
      
      if (updatedCall.agentId !== undefined && !isManualAssignment) {
        updateData.agent_id = updatedCall.agentId === "none" ? null : updatedCall.agentId;
      } else if (isManualAssignment) {
        // Para asignaciones manuales, agent_id siempre es null
        updateData.agent_id = null;
      }
      
      if (updatedCall.tipificacionId !== undefined) {
        updateData.tipificacion_id = updatedCall.tipificacionId === "none" ? null : updatedCall.tipificacionId;
      }
      
      // Handle result conversion from form values to database values
      if (updatedCall.result !== undefined) {
        // Convert form value to database value
        if (updatedCall.result === "not_selected" || updatedCall.result === null) {
          updateData.result = null;
        } else if (updatedCall.result === "venta" || updatedCall.result === "no venta") {
          updateData.result = updatedCall.result;
        }
      }
      
      console.log("Datos formateados para Supabase:", updateData);
      
      // Check if we have anything to update
      if (Object.keys(updateData).length === 0) {
        console.log("No changes to update");
        toast.info("No se realizaron cambios");
        setIsUpdating(false);
        setShowEditDialog(false);
        return;
      }
      
      // Show loading toast
      toast.loading("Actualizando llamada...", { id: "update-call" });
      
      const { data, error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', id)
        .select();
        
      if (error) {
        console.error("Error detallado al actualizar la llamada:", error);
        throw error;
      }
      
      console.log("Actualización exitosa, datos recibidos:", data);
      
      // Update local state with server response data
      if (data && data.length > 0) {
        const updatedCallData: Call = {
          ...call,
          agentId: data[0].agent_id,
          agentName: data[0].agent_name || "Sin asignar",
          tipificacionId: data[0].tipificacion_id,
          result: data[0].result as "" | "venta" | "no venta" || ""
        };
        setCall(updatedCallData);
        
        // Success message and close dialog
        toast.success("Llamada actualizada correctamente", { id: "update-call" });
        
        // Refresh the page to ensure all data is updated correctly
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } else {
        // If no data returned but no error, update with provided data
        // Convert FormResultValue to database value for local state
        let dbResult: "" | "venta" | "no venta" = "";
        if (updatedCall.result === "venta") dbResult = "venta";
        else if (updatedCall.result === "no venta") dbResult = "no venta";
        
        const updatedCallData: Call = {
          ...call,
          agentId: updatedCall.agentId === "none" ? null : updatedCall.agentId,
          agentName: updatedCall.agentName || call.agentName || "Sin asignar",
          tipificacionId: updatedCall.tipificacionId === "none" ? null : updatedCall.tipificacionId,
          result: dbResult
        };
        setCall(updatedCallData);
        
        toast.success("Llamada actualizada correctamente", { id: "update-call" });
      }
      
      setShowEditDialog(false);
    } catch (error) {
      console.error("Error al actualizar la llamada:", error);
      toast.error("Error al actualizar la llamada", {
        id: "update-call",
        description: "Verifica que los datos sean correctos e intenta nuevamente"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return <CallDetailSkeleton />;
  }

  if (!call) {
    return <CallNotFound />;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-start">
        <CallHeader call={call} />
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowChatDialog(true)}
            className="flex items-center"
          >
            <MessageSquare className="h-4 w-4 mr-2" /> Consultar
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setShowEditDialog(true)}
            disabled={isUpdating}
          >
            <Edit className="h-4 w-4 mr-2" /> Editar
          </Button>
        </div>
      </div>

      <AudioPlayer audioUrl={call.audioUrl} filename={call.filename} />

      <CallDetailTabs 
        call={call} 
        transcriptSegments={transcriptSegments} 
      />

      <EditCallDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        call={call} 
        onSubmit={handleCallUpdate} 
      />
      
      <CallChatDialog
        open={showChatDialog}
        onOpenChange={setShowChatDialog}
        call={call}
      />
    </div>
  );
}
