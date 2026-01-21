
import React, { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Send, Loader2, Bot, User, X, AlertCircle } from "lucide-react";
import { Call, ChatMessage } from "@/lib/types";
import { useCallChatMessages } from "@/hooks/useCallData";
import { sendMessageToCallAI, saveChatMessage } from "./chatService";
import { toast } from "sonner";
import { useLimitsCheck, canProcessChat } from "@/hooks/useLimitsCheck";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { ChatMessageItem } from "@/components/calls/detail/ChatMessage";

interface CallChatDialogProps {
  call: Call;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CallChatDialog({ call, open, onOpenChange }: CallChatDialogProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  
  const { data: messagesData = [], refetch } = useCallChatMessages(call.id);
  
  // Convert the raw data to ChatMessage format and ensure it's always an array
  const messages: ChatMessage[] = Array.isArray(messagesData) ? messagesData.map(msg => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    timestamp: msg.timestamp,
    user_id: msg.user_id
  })) : [];

  // Verificar límites de CHAT/CONSULTAS
  // 1) Por subtipo chat_llamada (telemetría específica)
  const { data: callChatLimit, refetch: refetchCallChatLimit } = useLimitsCheck("chat", "chat_llamada");
  // 2) Global de CHAT (suma general y llamada) para bloquear si el total de Consultas se supera
  const { data: globalChatLimit, refetch: refetchGlobalChatLimit } = useLimitsCheck("chat");

  // Verificar si está bloqueado por límites DE CHAT para esta cuenta específica
  useEffect(() => {
    const blockedByCallChat = !!callChatLimit?.limite_alcanzado;
    const blockedByGlobal = !!globalChatLimit?.limite_alcanzado;
    if (call.account_id && (blockedByCallChat || blockedByGlobal)) {
      console.log(
        `CallChatDialog: Account ${call.account_id} blocked due to chat limits:`,
        { callChatLimit, globalChatLimit }
      );
      setIsBlocked(true);
    } else {
      setIsBlocked(false);
    }
  }, [callChatLimit, globalChatLimit, call.account_id]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isBlocked) return;

    if (!call.account_id) {
      console.error("CallChatDialog: call.account_id is missing:", call);
      toast.error("No se puede procesar el mensaje: cuenta no identificada");
      return;
    }

    // VALIDACIÓN CRÍTICA: Verificar límites de CONSULTAS (global) usando función de BD
    console.log(`CallChatDialog: Verificando límites de CONSULTAS (global) para cuenta ${call.account_id}...`);
    const canProcess = await canProcessChat(call.account_id);
    if (!canProcess) {
      setIsBlocked(true);
      toast.error("Límite de consultas alcanzado", {
        description: "Has alcanzado el límite mensual para interacciones con el chatbot. Intenta nuevamente el próximo mes.",
        duration: 10000,
      });
      return; // BLOQUEO TOTAL - No procesar el mensaje
    }

    setIsLoading(true);

    try {
      console.log(`CallChatDialog: Guardando mensaje del usuario para cuenta ${call.account_id} con nuevos triggers...`);
      const userMessage = {
        call_id: call.id,
        role: 'user',
        content: inputValue,
        timestamp: new Date().toISOString(),
        user_id: user?.id || undefined,
        account_id: call.account_id
      };

      const { error: saveError } = await supabase
        .from('call_chat_messages')
        .insert(userMessage);

      if (saveError) {
        console.error('CallChatDialog: Error saving user message:', saveError);
        
        // Detectar errores de límite del trigger (SOLO CONSULTAS) con nuevos mensajes específicos
        if (saveError.message && 
            (saveError.message.includes('Límite de consultas por llamada alcanzado para la cuenta') ||
             saveError.message.includes('interacciones con el chatbot'))) {
          
          setIsBlocked(true);
          toast.error("Límite de consultas alcanzado", {
            description: "Has alcanzado el límite mensual para interacciones con el chatbot. Intenta nuevamente el próximo mes.",
            duration: 10000,
          });
          return; // BLOQUEO INMEDIATO
        }
        
        throw new Error(saveError.message);
      }

      // VALIDACIÓN ANTES DE IA: Verificar límites de CONSULTAS (global) antes de generar respuesta de IA
      console.log(`CallChatDialog: Verificando límites de CONSULTAS (global) antes de generar respuesta de IA para cuenta ${call.account_id}...`);
      const stillCanProcess = await canProcessChat(call.account_id);
      if (!stillCanProcess) {
        setIsBlocked(true);
        toast.error("Límite de consultas alcanzado", {
          description: "Has alcanzado el límite mensual para interacciones con el chatbot. La IA no puede responder.",
          duration: 10000,
        });
        
        // Refrescar para mostrar el mensaje del usuario pero sin respuesta de IA
        await refetch();
        setInputValue("");
        return; // BLOQUEO - No generar respuesta de IA
      }

      // Si todo está bien, proceder con la respuesta de IA
console.log(`CallChatDialog: Generando respuesta de IA para cuenta ${call.account_id}...`);
const aiResponse = await sendMessageToCallAI(inputValue, messages, call);

if (aiResponse) {
  const aiMessage = {
    call_id: call.id,
    role: 'assistant',
    content: aiResponse,
    timestamp: new Date().toISOString(),
    account_id: call.account_id
  };
  const { error: aiSaveError } = await supabase
    .from('call_chat_messages')
    .insert(aiMessage);

  if (aiSaveError) {
    console.error('Error guardando la respuesta de la IA:', aiSaveError);
    toast.error("Error guardando la respuesta de la IA");
  }
}

setInputValue("");
await refetch();
      
      // Refrescar límites después del proceso
      await Promise.all([refetchCallChatLimit(), refetchGlobalChatLimit()]);
      
    } catch (error) {
      console.error("CallChatDialog: Error sending message:", error);
      
      // Si es error de límite con nuevos mensajes específicos, no mostrar mensaje de error genérico
      if (error instanceof Error && 
          (error.message.includes('Límite de consultas por llamada alcanzado para la cuenta') ||
           error.message.includes('interacciones con el chatbot'))) {
        
        setIsBlocked(true);
        return;
      }
      
      toast.error("Error al enviar el mensaje");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Chat sobre la llamada: {call.title}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Alerta de límite alcanzado SOLO PARA CONSULTAS */}
        {isBlocked && (
          <Alert variant="destructive" className="mx-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Límite de consultas alcanzado:</strong> Has alcanzado el límite mensual para interacciones con el chatbot. 
              No puedes hacer más preguntas hasta el próximo mes o hasta que un administrador amplíe tu límite.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex-1 flex flex-col min-h-0">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-lg mb-4 min-h-0">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[200px]">
                <div className="text-center">
                  <Bot className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Chat sobre esta llamada</h3>
                  <p className="text-muted-foreground max-w-md">
                    Haz preguntas específicas sobre esta llamada. Tengo acceso a toda la información: transcripción, análisis y contexto.
                  </p>
                  {isBlocked && (
                    <p className="text-sm text-red-600 mt-4">
                      ⚠️ Límite de consultas alcanzado. Contacta al administrador.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              messages.map((message, index) => (
                <ChatMessageItem key={index} message={message} />
              ))
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <Card className="bg-white">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2">
                      <Bot className="h-5 w-5" />
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Analizando...</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area - Disabled when blocked */}
          <div className="flex gap-2 flex-shrink-0">
            <Textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isBlocked ? "Límite de consultas alcanzado - No puedes enviar más mensajes" : "Pregunta algo específico sobre esta llamada..."}
              className="flex-1 min-h-[60px] max-h-[120px] resize-none"
              disabled={isLoading || isBlocked}
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isBlocked}
              size="lg"
              className="px-4 h-auto min-h-[60px]"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
