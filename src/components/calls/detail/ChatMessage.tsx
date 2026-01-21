
import React, { useEffect, useState } from 'react';
import { ChatMessage as ChatMessageType } from "@/lib/types";
import { Loader2, User, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading?: boolean;
}

export function ChatMessageItem({ message, isLoading = false }: ChatMessageProps) {
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    if (message.user_id) {
      loadUserName(message.user_id);
    }
  }, [message.user_id]);

  const loadUserName = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .single();
    
    if (data) {
      setUserName(data.full_name);
    }
  };

  const formatDate = (timestamp: string) => {
    try {
      return format(new Date(timestamp), "dd/MM/yyyy HH:mm", { locale: es });
    } catch {
      return "";
    }
  };

  return (
    <div 
      className={`flex flex-col ${message.role === "assistant" ? "items-start" : "items-end"}`}
    >
      {/* Encabezado con usuario y fecha */}
      {message.role === "user" && (
        <div className="flex items-center gap-2 mb-1 text-xs text-muted-foreground">
          {userName && (
            <>
              <User className="h-3 w-3" />
              <span className="font-medium">{userName}</span>
            </>
          )}
          {message.timestamp && (
            <>
              <Clock className="h-3 w-3 ml-2" />
              <span>{formatDate(message.timestamp)}</span>
            </>
          )}
        </div>
      )}
      
      <div 
        className={`rounded-lg px-4 py-2 max-w-[80%] ${
          message.role === "assistant" 
            ? "bg-muted text-foreground"
            : "bg-primary text-primary-foreground"
        }`}
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>

      {/* Fecha para mensajes del asistente */}
      {message.role === "assistant" && message.timestamp && (
        <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{formatDate(message.timestamp)}</span>
        </div>
      )}
    </div>
  );
}
