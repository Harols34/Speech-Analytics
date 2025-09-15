
import React from 'react';
import { ChatMessage as ChatMessageType } from "@/lib/types";
import { Loader2 } from "lucide-react";

interface ChatMessageProps {
  message: ChatMessageType;
  isLoading?: boolean;
}

export function ChatMessageItem({ message, isLoading = false }: ChatMessageProps) {
  return (
    <div 
      className={`flex ${message.role === "assistant" ? "justify-start" : "justify-end"}`}
    >
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
    </div>
  );
}
