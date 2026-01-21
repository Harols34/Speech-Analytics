import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare } from "lucide-react";
import ChatMessage from "./ChatMessage";
import { useVectorizedChat } from "@/hooks/useVectorizedChat";
import { useChatConsultationLimit, showChatConsultationLimitMessage } from "@/hooks/useAccountLimits";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
export default function ChatInterface() {
  const [inputMessage, setInputMessage] = useState("");
  
  // Verificar límite de consultas
  const { data: consultationLimit } = useChatConsultationLimit();
  const isConsultationBlocked = !!consultationLimit?.limite_alcanzado;
  
  const {
    messages,
    isLoading,
    sendMessage
  } = useVectorizedChat();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Auto-scroll al final cuando llegan nuevos mensajes
  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;
    
    // Verificar límite antes de enviar mensaje
    if (isConsultationBlocked) {
      showChatConsultationLimitMessage(consultationLimit);
      return;
    }
    
    await sendMessage(inputMessage);
    setInputMessage("");
  };
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  return <div className="flex flex-col h-full w-full px-0 my-0">
      {/* Alerta de límite alcanzado */}
      {isConsultationBlocked && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Límite de consultas IA alcanzado</AlertTitle>
          <AlertDescription>
            Has alcanzado el límite mensual para consultas en el módulo IA. 
            Contacta al administrador para aumentar el límite y poder continuar consultando.
          </AlertDescription>
        </Alert>
      )}
      
      {/* Área de mensajes con scroll */}
      <div className="flex-1 min-h-0 mb-6">
        <ScrollArea className="h-full border rounded-lg bg-background" ref={scrollAreaRef}>
          <div className="p-6 space-y-6 px-[14px] mx-0">
            {messages.length === 0 ? <div className="text-center text-muted-foreground py-12">
                <MessageSquare className="h-16 w-16 mx-auto mb-6 opacity-50" />
                <p className="text-xl font-medium mb-3">¡Hola! Soy tu asistente de análisis de llamadas</p>
                <p className="text-sm max-w-md mx-auto">
                  Puedo ayudarte a analizar tus llamadas, obtener estadísticas y responder preguntas sobre los datos.
                </p>
              </div> : messages.map((message, index) => <ChatMessage key={index} message={message} isLoading={index === messages.length - 1 && isLoading} />)}
            {isLoading && messages.length > 0 && <div className="flex justify-start">
                <div className="bg-muted rounded-lg p-4 max-w-[80%]">
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">Analizando...</span>
                  </div>
                </div>
              </div>}
          </div>
        </ScrollArea>
      </div>

      {/* Input de mensaje */}
      <div className="flex space-x-2">
        <Input 
          value={inputMessage} 
          onChange={e => setInputMessage(e.target.value)} 
          onKeyPress={handleKeyPress} 
          placeholder={isConsultationBlocked ? "Límite de consultas alcanzado" : "Escribe tu consulta sobre las llamadas..."} 
          disabled={isLoading || isConsultationBlocked} 
          className="flex-1 h-12" 
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={!inputMessage.trim() || isLoading || isConsultationBlocked} 
          size="lg" 
          className="h-12 px-6"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Botón limpiar chat si hay mensajes */}
      {messages.length > 0 && <div className="mt-2 flex justify-end"></div>}
    </div>;
}