
import { supabase } from "@/integrations/supabase/client";
import { Call, ChatMessage } from "@/lib/types";
import { toast } from 'sonner';

export async function loadChatHistory(callId: string): Promise<ChatMessage[]> {
  if (!callId) return [];

  try {
    // Calcular fecha de hace 15 días
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const response: any = await supabase
      .from('call_chat_messages')
      .select('*')
      .eq('call_id', callId)
      .gte('timestamp', fifteenDaysAgo.toISOString())
      .order('timestamp', { ascending: true });
    
    if (response.error) {
      console.error("Error loading chat history:", response.error);
      return [];
    }

    if (response.data && response.data.length > 0) {
      return response.data.map((msg: any) => ({
        id: msg.id,
        role: (msg.role === 'user' || msg.role === 'assistant') 
          ? msg.role as "user" | "assistant" 
          : "assistant",
        content: msg.content,
        timestamp: msg.timestamp,
        call_id: callId,
        user_id: msg.user_id
      }));
    }
    
    return [];
  } catch (e) {
    console.error("Error in loadChatHistory:", e);
    return [];
  }
}

export async function saveChatMessage(message: ChatMessage): Promise<boolean> {
  if (!message.call_id) return false;

  try {
    const response: any = await supabase
      .from('call_chat_messages')
      .insert({
        content: message.content,
        role: message.role,
        call_id: message.call_id,
        timestamp: new Date().toISOString(),
        user_id: message.user_id
      });
    
    if (response.error) {
      console.error("Error saving chat message:", response.error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error("Exception saving chat message:", e);
    return false;
  }
}

export async function sendMessageToCallAI(
  input: string, 
  messages: ChatMessage[], 
  call: Call
): Promise<string | null> {
  try {
    // Preparar transcripción completa
    let transcriptText = "";
    if (call.transcription) {
      try {
        const transcriptSegments = typeof call.transcription === 'string' 
          ? JSON.parse(call.transcription) 
          : call.transcription;
          
        if (Array.isArray(transcriptSegments)) {
          transcriptText = transcriptSegments.map(segment => {
            const speakerLabel = segment.speaker === "agent" 
              ? "Asesor: " 
              : segment.speaker === "client" 
              ? "Cliente: " 
              : "Silencio: ";
            return speakerLabel + segment.text;
          }).join('\n');
        } else {
          transcriptText = String(call.transcription);
        }
      } catch (error) {
        console.error("Error parsing transcript:", error);
        transcriptText = String(call.transcription);
      }
    }

    // Preparar información del feedback si existe
    let feedbackInfo = "";
    if (call.feedback) {
      feedbackInfo = `
FEEDBACK DE LA LLAMADA:
- Puntuación: ${call.feedback.score}/100
- Aspectos positivos: ${call.feedback.positive?.join(', ') || 'No especificados'}
- Aspectos negativos: ${call.feedback.negative?.join(', ') || 'No especificados'}
- Oportunidades de mejora: ${call.feedback.opportunities?.join(', ') || 'No especificadas'}
- Sentimiento general: ${call.feedback.sentiment || 'No analizado'}
- Temas identificados: ${call.feedback.topics?.join(', ') || 'No especificados'}
- Entidades mencionadas: ${call.feedback.entities?.join(', ') || 'No especificadas'}

ANÁLISIS DE COMPORTAMIENTOS:
${call.feedback.behaviors_analysis?.map(behavior => 
  `- ${behavior.name}: ${behavior.evaluation.toUpperCase()} - ${behavior.comments}`
).join('\n') || 'No hay análisis de comportamientos disponible'}
`;
    }

    // Preparar información del resumen
    let summaryInfo = call.summary ? `\nRESUMEN DE LA LLAMADA:\n${call.summary}` : "";

    const response: any = await supabase.functions.invoke('ai-chat', {
      body: {
        message: input,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        context: {
          callId: call.id,
          callTitle: call.title,
          agentName: call.agentName,
          duration: call.duration,
          date: call.date,
          result: call.result,
          product: call.product,
          reason: call.reason,
          statusSummary: call.statusSummary,
          transcription: transcriptText,
          summary: summaryInfo,
          feedback: feedbackInfo,
          isCallSpecific: true // Indicador para el edge function
        }
      }
    });
    
    if (response.error) {
      throw new Error(response.error.message || "Error al procesar tu pregunta");
    }

    return response.data?.response || null;
  } catch (error) {
    console.error("Error in call chat:", error);
    toast.error("Error al procesar tu pregunta", {
      description: error instanceof Error ? error.message : "Inténtalo de nuevo más tarde"
    });
    return null;
  }
}
