
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ChatMessage, Call } from "@/lib/types";
import { ChatMessageList } from "./ChatMessageList";
import { MessageInput } from "@/components/ui/message-input";
import { useUser } from "@/hooks/useUser";
import { loadChatHistory, saveChatMessage, sendMessageToCallAI } from "./chatService";
import { toast } from "sonner";

interface CallChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  call: Call;
}

export default function CallChatDialog({ open, onOpenChange, call }: CallChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();
  
  // Load chat history when dialog opens
  useEffect(() => {
    if (open && call.id) {
      loadChatMessages();
    }
  }, [open, call.id]);
  
  const loadChatMessages = async () => {
    if (!call.id) return;
    
    try {
      const history = await loadChatHistory(call.id);
      setMessages(history);
      
      // Si no hay historial, agregar mensaje de bienvenida específico para la llamada
      if (history.length === 0) {
        const initialMessage: ChatMessage = {
          id: "welcome",
          role: "assistant",
          content: `👋 Hola, soy tu asistente especializado para analizar la llamada "${call.title}".

Tengo acceso completo a:
• 📞 Transcripción completa de la llamada
• 👤 Información del agente: ${call.agentName}
• ⏱️ Duración: ${call.duration} segundos
• 📅 Fecha: ${new Date(call.date).toLocaleDateString()}
• 🎯 Resultado: ${call.result || 'No especificado'}
• 📝 Resumen de la llamada
• 📊 Feedback y análisis de comportamientos
• 🏷️ Tipificaciones y productos mencionados

¿Qué te gustaría saber específicamente sobre esta llamada? Puedo ayudarte con:
- Análisis detallado de la conversación
- Evaluación del desempeño del agente
- Identificación de oportunidades de mejora
- Resumen de puntos clave
- Análisis de sentimientos y emociones
- Cumplimiento de procesos y protocolos`,
          timestamp: new Date().toISOString(),
          call_id: call.id
        };
        
        setMessages([initialMessage]);
        await saveChatMessage(initialMessage);
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
      toast.error("Error cargando el historial de chat");
    }
  };
  
  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading || !call.id) return;
    
    setInputValue("");
    setIsLoading(true);
    
    try {
      // Agregar mensaje del usuario inmediatamente
      const userMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "user",
        content: message,
        timestamp: new Date().toISOString(),
        call_id: call.id,
        user_id: user?.id
      };
      
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      
      // Guardar mensaje del usuario
      await saveChatMessage(userMessage);
      
      // Obtener respuesta del AI específica para la llamada
      const aiResponse = await sendMessageToCallAI(message, updatedMessages, call);
      
      if (aiResponse) {
        const aiMessage: ChatMessage = {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: aiResponse,
          timestamp: new Date().toISOString(),
          call_id: call.id
        };
        
        setMessages([...updatedMessages, aiMessage]);
        await saveChatMessage(aiMessage);
      } else {
        toast.error("No se pudo obtener respuesta del asistente");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Error enviando el mensaje");
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>💬 Chat especializado - {call.title}</span>
            <span className="text-sm text-muted-foreground font-normal">
              ({call.agentName})
            </span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          <ChatMessageList messages={messages} isLoading={isLoading} />
          
          <MessageInput
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSendMessage}
            placeholder="Pregunta sobre esta llamada específica..."
            disabled={isLoading}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
