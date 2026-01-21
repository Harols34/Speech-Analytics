
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
    // Obtener account_id de la llamada
    const { data: callData, error: callError } = await supabase
      .from('calls')
      .select('account_id')
      .eq('id', message.call_id)
      .single();

    if (callError || !callData?.account_id) {
      console.error("Error getting call data or account_id missing:", callError, callData);
      return false;
    }

    const response: any = await supabase
      .from('call_chat_messages')
      .insert({
        content: message.content,
        role: message.role,
        call_id: message.call_id,
        timestamp: new Date().toISOString(),
        user_id: message.user_id,
        account_id: callData.account_id
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
    // BLOQUEO GLOBAL por límite de consultas ANTES de llamar a la función Edge
    try {
      const { data, error } = await supabase.rpc('can_chat_for_account', {
        p_account_id: call.account_id,
        p_subtipo: null
      });
      if (error) {
        console.warn('sendMessageToCallAI: no se pudo verificar límite global de consultas:', error);
      } else if (data === false) {
        throw new Error('Límite de consultas alcanzado');
      }
    } catch (e) {
      // Si falla la verificación pero no es negativo explícito, continuamos
    }

    // Preparar transcripción completa
    let transcriptText = "";
    if (call.transcription) {
      try {
        // Si la transcripción es un string, intentar parsearlo como JSON primero
        if (typeof call.transcription === 'string') {
          // Verificar si parece ser JSON (comienza con [ o {)
          if (call.transcription.trim().startsWith('[') || call.transcription.trim().startsWith('{')) {
            try {
              const transcriptSegments = JSON.parse(call.transcription);
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
            } catch (jsonError) {
              // Si falla el parsing JSON, usar el string directamente
              transcriptText = String(call.transcription);
            }
          } else {
            // Si no parece JSON, usar directamente
            transcriptText = String(call.transcription);
          }
        } else if (Array.isArray(call.transcription)) {
          // Si ya es un array, procesarlo directamente
          transcriptText = (call.transcription as any[]).map((segment: any) => {
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
        console.error("Error processing transcript:", error);
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
