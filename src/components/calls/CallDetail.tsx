import { useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";
import { Edit } from "lucide-react";
import { Call } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import CallHeader from "./detail/CallHeader";
import AudioPlayer from "./detail/AudioPlayer";
import CallDetailTabs from "./detail/CallDetailTabs";
import EditCallDialog from "./detail/EditCallDialog";
import CallDetailSkeleton from "./detail/CallDetailSkeleton";
import CallNotFound from "./detail/CallNotFound";
import { useCallData } from "@/hooks/useCallData";

type FormResultValue = "not_selected" | "venta" | "no venta";

type CallUpdateInput = Partial<Omit<Call, 'result'>> & { 
  result?: FormResultValue | null; 
  statusSummary?: string;
};

export default function CallDetail() {
  const { id } = useParams<{ id: string }>();
  const { call, setCall, isLoading, transcriptSegments } = useCallData(id);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCallUpdate = async (updatedCall: CallUpdateInput) => {
    if (!call || !id) return;
    
    setIsUpdating(true);
    
    try {
      console.log("Actualizando llamada con datos:", updatedCall);
      
      const updateData: Record<string, any> = {};
      
      if (updatedCall.agentName !== undefined) {
        updateData.agent_name = updatedCall.agentName;
      }
      
      const isManualAssignment = updatedCall.agentId === null && updatedCall.agentName && updatedCall.agentName !== "Sin asignar";
      
      if (updatedCall.agentId !== undefined && !isManualAssignment) {
        updateData.agent_id = updatedCall.agentId === "none" ? null : updatedCall.agentId;
      } else if (isManualAssignment) {
        updateData.agent_id = null;
      }
      
      if (updatedCall.tipificacionId !== undefined) {
        updateData.tipificacion_id = updatedCall.tipificacionId === "none" ? null : updatedCall.tipificacionId;
      }
      
      if (updatedCall.result !== undefined) {
        if (updatedCall.result === null || updatedCall.result === "not_selected") {
          updateData.result = null;
        } else if (updatedCall.result === "venta" || updatedCall.result === "no venta") {
          updateData.result = updatedCall.result;
        } else {
          console.warn("Unexpected result value:", updatedCall.result);
          updateData.result = null;
        }
      }
      
      if (updatedCall.statusSummary !== undefined) {
        updateData.status_summary = updatedCall.statusSummary;
      }
      
      console.log("Sending Supabase update with:", updateData);
      
      const { error } = await supabase
        .from('calls')
        .update(updateData)
        .eq('id', id);
        
      if (error) {
        console.error("Error detallado al actualizar la llamada:", error);
        throw error;
      }
      
      let typedResult: "" | "venta" | "no venta" = "";
      
      if (updatedCall.result === "venta") {
        typedResult = "venta";
      } else if (updatedCall.result === "no venta") {
        typedResult = "no venta";
      }
      
      setCall({
        ...call,
        agentId: isManualAssignment ? null : (updatedCall.agentId === "none" ? null : updatedCall.agentId),
        agentName: updatedCall.agentName || call.agentName,
        tipificacionId: updatedCall.tipificacionId === "none" ? null : updatedCall.tipificacionId,
        result: typedResult,
        statusSummary: updatedCall.statusSummary || call.statusSummary || ""
      });
      
      toast.success("Llamada actualizada correctamente");
      setShowEditDialog(false);
    } catch (error) {
      console.error("Error al actualizar la llamada:", error);
      toast.error("Error al actualizar la llamada", {
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
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowEditDialog(true)}
          className="ml-4"
          disabled={isUpdating}
        >
          <Edit className="h-4 w-4 mr-2" /> Editar
        </Button>
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
    </div>
  );
}
